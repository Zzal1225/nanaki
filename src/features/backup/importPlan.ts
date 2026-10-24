import type { Budget } from '@/features/budget/schema/budget';
import type { FixedExpense } from '@/features/fixedExpenses/schema/fixedExpense';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import type { Routine } from '@/features/routines/schema/routine';
import type { BackupData } from './backupFile';

// 백업 불러오기 계획: "없는 것만 더하기" (2026-10-24 사용자 결정). 계산은 순수 함수로 두고 테스트한다.
//
// id를 어떻게 정하나 (세 가지를 같이 지키려고):
// 1) 지금 계정에 원래 id가 있으면 건너뛴다 → 같은 계정에 같은 백업을 불러와도 겹치지 않는다
// 2) 없으면 "계정 id + 원래 id"로 정해지는 새 id로 넣는다 → 같은 파일을 두 번 불러와도 같은 새 id라 두 번째는 건너뛰어진다
// 3) 새 id라 다른 계정(체험 → 구글)의 id와 부딪히지 않는다: 원래 id를 그대로 넣으면 그 id가 남의 계정에 살아 있을 때
//    DB 기본 키 충돌이 나는데, RLS 때문에 그 줄이 보이지 않아 이유도 알 수 없다

// 계정마다 정해지는 새 id: SHA-256(계정 id + 원래 id)의 앞 16바이트를 UUID 모양으로 (RFC 9562 버전 8 = "직접 정한 방식").
// 무작위가 아니라 같은 입력이면 늘 같은 값이어야 2)가 된다
export async function importedId(
  userId: string,
  originalId: string,
): Promise<string> {
  const input = new TextEncoder().encode(
    `nanaki-import:${userId}:${originalId}`,
  );
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', input),
  ).slice(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x80; // 버전 8
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // 변형(RFC)
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type ExistingIds = {
  recordIds: ReadonlySet<string>;
  routineIds: ReadonlySet<string>;
  fixedExpenseIds: ReadonlySet<string>;
  budgetMonths: ReadonlySet<string>;
};

export type ImportPlan = {
  routines: Routine[];
  records: RecordEntry[];
  budgets: Budget[];
  fixedExpenses: FixedExpense[];
  // 지금 계정에 이미 있어 건너뛴 항목 수 (원래 id로 찾은 것만. 새 id로 겹친 것은 저장 때 DB가 건너뛴다)
  skippedCount: number;
};

// 원래 id → 넣을 id 표를 미리 만든다 (해시가 비동기라 계획 함수 밖에서)
export async function buildIdMap(
  userId: string,
  data: BackupData,
): Promise<Map<string, string>> {
  const ids = [
    ...data.records.map((item) => item.id),
    ...data.routines.map((item) => item.id),
    ...data.fixedExpenses.map((item) => item.id),
  ];
  const map = new Map<string, string>();
  await Promise.all(
    ids.map(async (id) => map.set(id, await importedId(userId, id))),
  );
  return map;
}

export function planImport(
  data: BackupData,
  existing: ExistingIds,
  idMap: ReadonlyMap<string, string>,
): ImportPlan {
  let skippedCount = 0;
  const target = (id: string) => idMap.get(id) ?? id;

  // 루틴: 이미 있으면 그 루틴을 그대로 쓰고(체크가 원래 id로 이어진다), 없으면 새 id로
  const routineIdFor = new Map<string, string>();
  const routines: Routine[] = [];
  for (const routine of data.routines) {
    if (existing.routineIds.has(routine.id)) {
      routineIdFor.set(routine.id, routine.id);
      skippedCount += 1;
      continue;
    }
    const id = target(routine.id);
    routineIdFor.set(routine.id, id);
    routines.push({ ...routine, id });
  }

  const records: RecordEntry[] = [];
  for (const record of data.records) {
    if (existing.recordIds.has(record.id)) {
      skippedCount += 1;
      continue;
    }
    const id = target(record.id);
    // 루틴 체크는 바뀐 루틴 id를 따라간다 (백업에 없는 루틴의 체크는 원래 id 그대로: 지금 계정에 그 루틴이 있을 수 있다)
    records.push(
      record.type === 'routine'
        ? {
            ...record,
            id,
            fields: {
              ...record.fields,
              routineId:
                routineIdFor.get(record.fields.routineId) ??
                record.fields.routineId,
            },
          }
        : { ...record, id },
    );
  }

  // 예산은 달마다 한 줄(id 없음): 지금 계정에 그 달이 있으면 그대로 둔다
  const budgets: Budget[] = [];
  for (const budget of data.budgets) {
    if (existing.budgetMonths.has(budget.month)) skippedCount += 1;
    else budgets.push(budget);
  }

  const fixedExpenses: FixedExpense[] = [];
  for (const item of data.fixedExpenses) {
    if (existing.fixedExpenseIds.has(item.id)) {
      skippedCount += 1;
      continue;
    }
    fixedExpenses.push({ ...item, id: target(item.id) });
  }

  return { routines, records, budgets, fixedExpenses, skippedCount };
}
