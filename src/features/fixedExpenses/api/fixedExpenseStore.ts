import { currentLocalDb } from '@/lib/db/currentLocalDb';
import type { LocalFixedExpense } from '@/lib/db/localDb';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';
import {
  fixedExpenseInputSchema,
  fixedExpenseSchema,
  type FixedExpense,
  type FixedExpenseInput,
} from '../schema/fixedExpense';

// 고정지출 저장·조회의 유일한 입구 (예산의 budgetStore와 같은 규칙: 훅·컴포넌트는 Supabase를 직접 부르지 않는다).
// "내 것만" 조건은 쓰지 않는다. RLS가 auth.uid() = user_id를 붙인다.
// 조회: 온라인이면 서버 목록을 받아 기기 사본을 통째로 바꾸고, 오프라인·응답 없음이면 사본으로 답한다.
// 바꾸기(추가·수정·삭제)는 온라인 전용 (예산·루틴과 같은 판단: 드물게 바꾸고, 서버가 그날 기록을 만들므로 서버에 있어야 뜻이 있다)

// 서버를 기다리는 최대 시간. 넘으면 사본으로 답한다 (예산과 같은 값)
export const FIXED_EXPENSE_TIMEOUT_MS = 3_000;

type FixedExpenseRow = Pick<
  Tables<'fixed_expenses'>,
  | 'id'
  | 'name'
  | 'amount'
  | 'category'
  | 'payment_method'
  | 'schedule'
  | 'start_date'
  | 'last_recorded_on'
>;

const SELECT_COLUMNS =
  'id, name, amount, category, payment_method, schedule, start_date, last_recorded_on';

// 서버 줄 → 앱 값. schedule은 jsonb라 모양을 믿지 않고 스키마로 검사한다.
// 결제수단이 없으면(null) 칸을 빼서 가계부 fields의 optional과 같은 모양으로
function toFixedExpense(row: FixedExpenseRow): FixedExpense {
  return fixedExpenseSchema.parse({
    id: row.id,
    name: row.name,
    amount: row.amount,
    category: row.category,
    ...(row.payment_method ? { paymentMethod: row.payment_method } : {}),
    schedule: row.schedule,
    startDate: row.start_date,
    lastRecordedOn: row.last_recorded_on,
  });
}

function toRowValues(input: FixedExpenseInput) {
  return {
    name: input.name,
    amount: input.amount,
    category: input.category,
    payment_method: input.paymentMethod ?? null,
    schedule: input.schedule,
  };
}

async function readCopy(): Promise<LocalFixedExpense[]> {
  const db = await currentLocalDb();
  return db.fixedExpenses.toArray();
}

// 결제일 순(같으면 이름 순)으로. 시안 18 목록이 날짜 순이다
function sortByDay(items: FixedExpense[]): FixedExpense[] {
  return [...items].sort(
    (a, b) =>
      a.schedule.day - b.schedule.day || a.name.localeCompare(b.name, 'ko'),
  );
}

// 한 번이라도 서버 목록을 받았는지. 사본이 비어 있는 것이 "고정지출 없음"인지 "아직 못 받음"인지 가린다
// (빈 사본을 "없음"으로 그리지 않게, 31단계에서 기록으로 겪은 함정). 표시는 계정별 사본 안에 둔다(LocalDb.pulls)
const PULL_NAME = 'fixedExpenses';

async function hasPulledOnce(): Promise<boolean> {
  const db = await currentLocalDb();
  return (await db.pulls.get(PULL_NAME)) !== undefined;
}

// 내 고정지출 전부 (결제일 순)
export async function listFixedExpenses(): Promise<FixedExpense[]> {
  const isOffline =
    typeof navigator !== 'undefined' && navigator.onLine === false;
  if (isOffline && (await hasPulledOnce())) return sortByDay(await readCopy());
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('fixed_expenses')
      .select(SELECT_COLUMNS)
      .abortSignal(AbortSignal.timeout(FIXED_EXPENSE_TIMEOUT_MS));
    if (error) throw error;
    const rows: FixedExpenseRow[] = data;
    const items = rows.map(toFixedExpense);
    const db = await currentLocalDb();
    // 통째로 바꾼다: 다른 기기에서 지운 고정지출이 사본에 남지 않게
    await db.transaction('rw', db.fixedExpenses, db.pulls, async () => {
      await db.fixedExpenses.clear();
      await db.fixedExpenses.bulkPut(items);
      await db.pulls.put({
        name: PULL_NAME,
        pulledAt: new Date().toISOString(),
      });
    });
    return sortByDay(items);
  } catch (error) {
    if (await hasPulledOnce()) return sortByDay(await readCopy());
    throw error;
  }
}

type CreateOptions = {
  // 'YYYY-MM-DD' (브라우저의 오늘). 시작일이 된다: 이 날보다 앞선 결제일은 서버가 만들지 않는다
  today: string;
  // 이 고정지출의 한 번을 이미 가계부에 적은 날 (가계부 쓰기에서 "고정지출"을 체크한 그 기록의 날짜). 없으면 null.
  // 그 달은 서버가 다시 만들지 않는다 (DB 함수: last_recorded_on이 이번 달이면 건너뜀)
  recordedOn: string | null;
};

// 고정지출 추가 (온라인 전용). 기록은 여기서 만들지 않는다:
// 가계부 쓰기에서 체크하면 기록은 폼이 평소처럼 만들고(기기 먼저 → 대기열), 여기서는 규칙만 서버에 넣는다 (2026-10-23 사용자 결정)
export async function createFixedExpense(
  input: FixedExpenseInput,
  { today, recordedOn }: CreateOptions,
): Promise<FixedExpense> {
  const checked = fixedExpenseInputSchema.parse(input);
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('fixed_expenses')
    .insert({
      ...toRowValues(checked),
      start_date: today,
      last_recorded_on: recordedOn,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  const row: FixedExpenseRow = data;
  const saved = toFixedExpense(row);
  const db = await currentLocalDb();
  await db.fixedExpenses.put(saved);
  return saved;
}

// 이름·금액·분류·결제수단·결제일 고치기. 시작일과 마지막 기록일은 그대로 둔다:
// 이번 달에 이미 기록했으면 결제일을 바꿔도 같은 달에 다시 만들지 않는다 (DB 함수가 "이번 달에 아직 안 만들었으면"만 본다)
export async function updateFixedExpense(
  id: string,
  input: FixedExpenseInput,
): Promise<FixedExpense> {
  const checked = fixedExpenseInputSchema.parse(input);
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('fixed_expenses')
    .update(toRowValues(checked))
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  const row: FixedExpenseRow = data;
  const saved = toFixedExpense(row);
  const db = await currentLocalDb();
  await db.fixedExpenses.put(saved);
  return saved;
}

// 해지 = 삭제 (2026-10-23 사용자 결정). 이미 만든 가계부 기록은 남는다 (규칙과 상관없는 복사본)
export async function deleteFixedExpense(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from('fixed_expenses').delete().eq('id', id);
  if (error) throw error;
  const db = await currentLocalDb();
  await db.fixedExpenses.delete(id);
}
