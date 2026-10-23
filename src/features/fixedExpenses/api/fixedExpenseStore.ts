import { createRecord } from '@/features/records/api/recordStore';
import { currentLocalDb } from '@/lib/db/currentLocalDb';
import type { LocalFixedExpense } from '@/lib/db/localDb';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';
import { toMonthString } from '@/shared/date/month';
import { dueDateInMonth, isDueDatePassed } from '../fixedExpenseDates';
import {
  FIXED_EXPENSE_TAG,
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
  // 'YYYY-MM-DD' (브라우저의 오늘). 시작일이 되고, 이번 달 결제일이 지났는지를 이걸로 본다
  today: string;
  // 이번 달 결제일이 이미 지났을 때 그 지출도 지금 기록할지 (2026-10-23 사용자 결정: 기본은 기록하지 않고 다음 결제일부터)
  includeCurrentMonth: boolean;
};

// 고정지출 추가. 이번 달 결제일이 지났고 includeCurrentMonth면 그 날짜로 가계부 기록도 하나 만든다:
// - 고정지출 줄을 먼저 서버에 넣는다(온라인 전용). 실패하면 기록도 만들지 않는다
// - 이번 달 것을 기록했다고 last_recorded_on에 함께 적어, 서버의 자동 기록이 같은 달에 또 만들지 않게 한다
// - 기록은 다른 기록과 같은 길(기기 먼저 → 대기열)로 만든다. 서버 함수에 맡기면 다음 정시까지 최대 1시간 늦게 보인다
export async function createFixedExpense(
  input: FixedExpenseInput,
  { today, includeCurrentMonth }: CreateOptions,
): Promise<FixedExpense> {
  const checked = fixedExpenseInputSchema.parse(input);
  const day = checked.schedule.day;
  const recordsCurrentMonth =
    includeCurrentMonth && isDueDatePassed(day, today);
  const dueThisMonth = dueDateInMonth(day, toMonthString(today));

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('fixed_expenses')
    .insert({
      ...toRowValues(checked),
      start_date: today,
      last_recorded_on: recordsCurrentMonth ? dueThisMonth : null,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  const row: FixedExpenseRow = data;
  const saved = toFixedExpense(row);
  const db = await currentLocalDb();
  await db.fixedExpenses.put(saved);

  if (recordsCurrentMonth) {
    await createRecord({
      type: 'expense',
      occurredAt: dueThisMonth,
      title: checked.name,
      memo: null,
      tags: [FIXED_EXPENSE_TAG],
      fields: {
        amount: checked.amount,
        category: checked.category,
        ...(checked.paymentMethod
          ? { paymentMethod: checked.paymentMethod }
          : {}),
      },
    });
  }
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
