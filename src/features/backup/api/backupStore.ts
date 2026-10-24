import { importBudgets, listBudgets } from '@/features/budget/api/budgetStore';
import {
  importFixedExpenses,
  listFixedExpenses,
} from '@/features/fixedExpenses/api/fixedExpenseStore';
import {
  importRecords,
  listAllRecordsNewestFirst,
  sendPendingRecords,
} from '@/features/records/api/recordStore';
import {
  importRoutines,
  listRoutines,
} from '@/features/routines/api/routineStore';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { buildBackup, type BackupFile, type ParsedBackup } from '../backupFile';
import { buildIdMap, planImport } from '../importPlan';

// 백업 저장하기·불러오기의 유일한 입구 (step4 39). 화면은 여기만 부른다 (다른 저장소와 같은 규칙).
// 둘 다 온라인 전용: 저장하기는 예산(서버에만 전부 있음)을, 불러오기는 서버에 넣는 일을 해야 한다

// 저장하기: 아직 안 보낸 기록을 먼저 보내 서버·사본이 맞은 뒤 모은다 (보내기 실패는 사본 그대로 담는다: 기기에 있는 건 사용자 기록이다).
// 기록은 오래된 것부터 (파일을 열어 볼 때 읽기 쉽게)
export async function exportBackup(now: Date): Promise<BackupFile> {
  await sendPendingRecords().catch(() => undefined);
  const [records, routines, budgets, fixedExpenses] = await Promise.all([
    listAllRecordsNewestFirst(),
    listRoutines(),
    listBudgets(),
    listFixedExpenses(),
  ]);
  return buildBackup(
    { records: [...records].reverse(), routines, budgets, fixedExpenses },
    now,
  );
}

export type ImportResult = {
  // 새로 들어간 항목 수 (기록·루틴·예산·고정지출 합)
  added: number;
  // 이미 있어 건너뛴 수 (원래 id로 찾은 것 + 같은 파일을 다시 불러와 새 id로 겹친 것)
  skipped: number;
  // 형식이 맞지 않아 읽지 못한 수
  invalid: number;
};

// 불러오기: "없는 것만 더하기" (importPlan). 루틴 → 기록 순서: 루틴 체크가 가리킬 루틴이 먼저 있어야 한다
export async function importBackup(
  backup: ParsedBackup,
): Promise<ImportResult> {
  const supabase = createSupabaseBrowserClient();
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error('로그인이 풀렸어요');

  // 지금 계정에 있는 것: 기기 사본(기록·루틴·고정지출)과 서버(예산 달)
  const [records, routines, fixedExpenses, budgets] = await Promise.all([
    listAllRecordsNewestFirst(),
    listRoutines(),
    listFixedExpenses(),
    listBudgets(),
  ]);
  const plan = planImport(
    backup.data,
    {
      recordIds: new Set(records.map((item) => item.id)),
      routineIds: new Set(routines.map((item) => item.id)),
      fixedExpenseIds: new Set(fixedExpenses.map((item) => item.id)),
      budgetMonths: new Set(budgets.map((item) => item.month)),
    },
    await buildIdMap(userId, backup.data),
  );

  const added =
    (await importRoutines(plan.routines)) +
    (await importRecords(plan.records)) +
    (await importBudgets(plan.budgets)) +
    (await importFixedExpenses(plan.fixedExpenses));
  const planned =
    plan.routines.length +
    plan.records.length +
    plan.budgets.length +
    plan.fixedExpenses.length;
  return {
    added,
    skipped: plan.skippedCount + (planned - added),
    invalid: backup.invalidCount,
  };
}
