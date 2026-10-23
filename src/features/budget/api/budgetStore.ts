import { currentLocalDb } from '@/lib/db/currentLocalDb';
import type { LocalBudget } from '@/lib/db/localDb';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';
import { budgetSchema, emptyBudget, type Budget } from '../schema/budget';

// 예산 저장·조회의 유일한 입구 (기록의 recordStore, 설정의 settingsStore와 같은 규칙: 훅·컴포넌트는 Supabase를 직접 부르지 않는다).
// "내 예산만" 조건은 쓰지 않는다. RLS가 auth.uid() = user_id를 붙인다.
// 설정과 같은 방식: 온라인이면 서버 값을 받아 기기 사본에 남기고, 오프라인·응답 없음이면 사본으로 답한다.
// 예산 바꾸기는 온라인 전용(설정·루틴과 같은 판단): 드물게 바꾸고, 오프라인 충돌을 따질 만큼 자주 쓰지 않는다

// 서버를 기다리는 최대 시간. 넘으면 사본으로 답한다 (끝나지 않는 요청, 25b)
export const BUDGET_TIMEOUT_MS = 3_000;

// DB 줄 모양은 자동 생성 타입에서 가져온다 (설정 저장소와 같은 이유: 조회 결과가 타입 검사를 받지 않아 받는 자리에서 붙인다)
type BudgetRow = Pick<
  Tables<'budgets'>,
  'month' | 'total_amount' | 'category_amounts'
>;

const SELECT_COLUMNS = 'month, total_amount, category_amounts';

// 화면에 줄 값: 보여 줄 예산 + 그 값이 어느 달 것인지.
// 그 달 예산이 없으면 가장 최근 달 예산을 이어받는다 (달마다 따로 두되, 매달 새로 입력하지 않아도 되게).
// sourceMonth: 값이 나온 달. 보는 달과 다르면 "지난 예산을 이어받음", null이면 예산을 한 번도 정하지 않음
export type BudgetView = {
  budget: Budget;
  sourceMonth: string | null;
};

// 서버 줄 → 앱 값. category_amounts는 jsonb라 모양을 믿지 않고 스키마로 검사한다
function toBudget(row: BudgetRow): Budget {
  return budgetSchema.parse({
    month: row.month,
    total: row.total_amount,
    categories: row.category_amounts,
  });
}

// 보는 달 기준으로 바꾼다: 이어받은 값도 month는 보는 달 (저장하면 보는 달 줄이 생긴다)
function toView(month: string, source: Budget | null): BudgetView {
  if (!source) return { budget: emptyBudget(month), sourceMonth: null };
  return {
    budget: { ...source, month },
    sourceMonth: source.month,
  };
}

async function saveCopy(budget: Budget): Promise<void> {
  const db = await currentLocalDb();
  const copy: LocalBudget = {
    month: budget.month,
    total: budget.total,
    categories: budget.categories,
  };
  await db.budgets.put(copy);
}

// 서버에서 예산을 한 번이라도 받았는지 (계정별 사본 안의 표시, LocalDb.pulls).
// 예산을 한 번도 안 정한 계정은 서버 답이 "없음"이라 사본에 남는 줄이 없다. 이 표시가 없으면 오프라인에서
// "받아 봤는데 없음"과 "아직 못 받음"을 가릴 수 없어 "예산 정하기" 대신 오류가 보였다 (2026-10-23 아이폰 비행기 모드 확인)
const PULL_NAME = 'budgets';

async function markPulled(): Promise<void> {
  const db = await currentLocalDb();
  await db.pulls.put({ name: PULL_NAME, pulledAt: new Date().toISOString() });
}

async function hasPulledOnce(): Promise<boolean> {
  const db = await currentLocalDb();
  return (await db.pulls.get(PULL_NAME)) !== undefined;
}

// 사본으로 답한다. 사본에 줄이 없어도 서버에서 "없음"을 받아 본 적이 있으면 빈 예산(예산 정하기).
// null = 한 번도 받지 못해 답할 수 없음 (부르는 쪽이 오류로 알린다)
async function answerFromCopy(month: string): Promise<BudgetView | null> {
  const copy = await readCopy(month);
  if (copy) return toView(month, copy);
  if (await hasPulledOnce()) return toView(month, null);
  return null;
}

// 사본에서 "그 달 또는 그 이전 중 가장 최근". undefined = 사본에 예산이 하나도 없음
async function readCopy(month: string): Promise<Budget | undefined> {
  const db = await currentLocalDb();
  return db.budgets.where(':id').belowOrEqual(month).last();
}

// 서버에서 "그 달 또는 그 이전 중 가장 최근" 한 줄. 글자 순서 = 달 순서라 month 내림차순 첫 줄
async function fetchLatest(month: string): Promise<Budget | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('budgets')
    .select(SELECT_COLUMNS)
    .lte('month', month)
    .order('month', { ascending: false })
    .limit(1)
    .abortSignal(AbortSignal.timeout(BUDGET_TIMEOUT_MS))
    .maybeSingle();
  if (error) throw error;
  const row: BudgetRow | null = data;
  return row ? toBudget(row) : null;
}

// 그 달 예산 (없으면 이어받은 예산, 그것도 없으면 빈 예산).
// 사본도 없는데 서버에서 못 받으면(이 기기에서 한 번도 못 받음) 오류를 그대로 던진다: 예산이 없는 것처럼 꾸며 보이지 않게
export async function getBudget(month: string): Promise<BudgetView> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const answer = await answerFromCopy(month);
    if (answer) return answer;
  }
  try {
    const latest = await fetchLatest(month);
    if (latest) await saveCopy(latest);
    await markPulled();
    return toView(month, latest);
  } catch (error) {
    const answer = await answerFromCopy(month);
    if (answer) return answer;
    throw error;
  }
}

// 그 달 예산을 저장한다 (없으면 만들고 있으면 고친다). user_id는 보내지 않는다: 기본값 auth.uid()가 채우고,
// 기본 키(user_id, month) 충돌로 수정이 된다. 잘못된 값은 서버에 보내기 전에 스키마가 막는다
export async function saveBudget(input: Budget): Promise<BudgetView> {
  const budget = budgetSchema.parse(input);
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('budgets')
    .upsert({
      month: budget.month,
      total_amount: budget.total,
      category_amounts: budget.categories,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  const row: BudgetRow = data;
  const saved = toBudget(row);
  await saveCopy(saved);
  return toView(saved.month, saved);
}
