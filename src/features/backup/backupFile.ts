import { z } from 'zod';
import { budgetSchema, type Budget } from '@/features/budget/schema/budget';
import {
  fixedExpenseSchema,
  type FixedExpense,
} from '@/features/fixedExpenses/schema/fixedExpense';
import {
  recordEntrySchema,
  type RecordEntry,
} from '@/features/records/schema/recordEntry';
import {
  routineSchema,
  type Routine,
} from '@/features/routines/schema/routine';

// 백업 파일 (step4 39). JSON 하나: 열어서 읽을 수 있고, 라이브러리 없이 만들고 읽는다.
// 담는 것: 기록 전부(루틴 체크 포함)·루틴·예산·고정지출. 담지 않는 것:
// - 사진 (2026-10-24 사용자 결정): 몸 사진이 기기 파일로 흘러나가지 않게, 파일도 작게 (CLAUDE.md 몸 사진 원칙)
// - 설정(숨긴 타입): 불러오기는 "없는 것만 더하기"라 지금 계정의 설정을 바꾸지 않는다
// 모양은 앱 값(camelCase, 검증된 RecordEntry 등) 그대로: DB 줄 모양에 묶이지 않게 하고, 불러올 때 같은 스키마로 다시 검사한다

export const BACKUP_APP = 'nanaki';
// 모양을 바꾸면 올린다. 읽는 쪽은 아는 버전만 받는다 (모르는 미래 버전을 잘못 읽어 기록을 망치지 않게)
export const BACKUP_VERSION = 1;

export type BackupData = {
  records: RecordEntry[];
  routines: Routine[];
  budgets: Budget[];
  fixedExpenses: FixedExpense[];
};

export type BackupFile = BackupData & {
  app: typeof BACKUP_APP;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
};

export function buildBackup(data: BackupData, now: Date): BackupFile {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    ...data,
  };
}

// 파일 이름: nanaki-backup-2026-10-24.json (날짜는 부르는 쪽의 로컬 오늘)
export function backupFileName(today: string): string {
  return `nanaki-backup-${today}.json`;
}

// 겉모양만 먼저 본다. 항목은 하나씩 검사해서 망가진 것만 건너뛴다 (한 줄 때문에 전부를 못 불러오지 않게)
const envelopeSchema = z.object({
  app: z.literal(BACKUP_APP),
  version: z.number(),
  records: z.array(z.unknown()).default([]),
  routines: z.array(z.unknown()).default([]),
  budgets: z.array(z.unknown()).default([]),
  fixedExpenses: z.array(z.unknown()).default([]),
});

export type ParsedBackup = {
  data: BackupData;
  // 형식이 맞지 않아 건너뛴 항목 수 (기록·루틴·예산·고정지출을 합쳐)
  invalidCount: number;
};

export type BackupParseError = 'notJson' | 'notBackup' | 'newerVersion';

export const BACKUP_PARSE_MESSAGE: Record<BackupParseError, string> = {
  notJson:
    '백업 파일을 읽지 못했어요. nanaki에서 저장한 .json 파일인지 확인해 주세요',
  notBackup: 'nanaki 백업 파일이 아니에요',
  newerVersion:
    '더 새 버전의 앱에서 만든 백업이에요. 앱을 새로 고친 뒤 다시 불러와 주세요',
};

function keepValid<T>(
  items: unknown[],
  schema: z.ZodType<T>,
): { valid: T[]; invalid: number } {
  const valid: T[] = [];
  let invalid = 0;
  for (const item of items) {
    const result = schema.safeParse(item);
    if (result.success) valid.push(result.data);
    else invalid += 1;
  }
  return { valid, invalid };
}

export function parseBackup(
  text: string,
): { ok: true; backup: ParsedBackup } | { ok: false; error: BackupParseError } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'notJson' };
  }
  const envelope = envelopeSchema.safeParse(json);
  if (!envelope.success) return { ok: false, error: 'notBackup' };
  if (envelope.data.version > BACKUP_VERSION) {
    return { ok: false, error: 'newerVersion' };
  }
  const records = keepValid(envelope.data.records, recordEntrySchema);
  const routines = keepValid(envelope.data.routines, routineSchema);
  const budgets = keepValid(envelope.data.budgets, budgetSchema);
  const fixedExpenses = keepValid(
    envelope.data.fixedExpenses,
    fixedExpenseSchema,
  );
  return {
    ok: true,
    backup: {
      data: {
        records: records.valid,
        routines: routines.valid,
        budgets: budgets.valid,
        fixedExpenses: fixedExpenses.valid,
      },
      invalidCount:
        records.invalid +
        routines.invalid +
        budgets.invalid +
        fixedExpenses.invalid,
    },
  };
}
