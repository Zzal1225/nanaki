import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TablesInsert } from '@/lib/supabase/database.types';
import {
  createAdminClient,
  deleteGuests,
  hasTestSupabase,
  signInAsNewGuest,
  type TestGuest,
} from './testSupabase';

const INSUFFICIENT_PRIVILEGE = '42501';
const CHECK_VIOLATION = '23514';

// 고정지출 표(step3): 다른 표와 같은 사용자 격리 + 이 표만의 규칙(해지 = 삭제, DB가 매달 규칙만 받음),
// 그리고 서버가 그날 가계부 기록을 만드는 함수(record_due_fixed_expenses, pg_cron이 매시간 부른다).
// 함수는 모든 사용자의 줄을 처리하므로, 확인은 늘 이 테스트가 만든 사용자의 기록만 본다

function fixedExpenseRow(
  values: Partial<TablesInsert<'fixed_expenses'>> & { day: number },
): TablesInsert<'fixed_expenses'> {
  const { day, ...rest } = values;
  return {
    name: '통신비',
    amount: 55000,
    category: '생활',
    schedule: { kind: 'monthly', day },
    start_date: '2026-10-01',
    ...rest,
  };
}

// 관리자 권한으로 자동 기록 함수를 그 날짜에 돌린다 (pg_cron이 하는 일)
async function runDailyJob(today: string) {
  const { error } = await createAdminClient().rpc('record_due_fixed_expenses', {
    p_today: today,
  });
  if (error) throw error;
}

async function autoRecordsOf(guest: TestGuest) {
  const { data, error } = await createAdminClient()
    .from('records')
    .select('occurred_at, title, tags, fields, type')
    .eq('user_id', guest.userId)
    .contains('tags', ['고정지출'])
    .order('occurred_at');
  if (error) throw error;
  return data;
}

describe.skipIf(!hasTestSupabase)('fixed_expenses RLS: 사용자 격리', () => {
  let alice: TestGuest;
  let bob: TestGuest;
  let aliceExpenseId: string;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAsNewGuest(), signInAsNewGuest()]);
    const { data, error } = await alice.client
      .from('fixed_expenses')
      .insert(fixedExpenseRow({ day: 5 }))
      .select('id')
      .single();
    if (error) throw error;
    aliceExpenseId = data.id;
  });

  afterAll(() => deleteGuests(alice, bob));

  it('다른 사람의 고정지출은 보이지 않고, 고치거나 지울 수 없다', async () => {
    expect((await bob.client.from('fixed_expenses').select('id')).data).toEqual(
      [],
    );

    const update = await bob.client
      .from('fixed_expenses')
      .update({ amount: 1 })
      .eq('id', aliceExpenseId)
      .select('id');
    expect(update.data).toEqual([]);

    const remove = await bob.client
      .from('fixed_expenses')
      .delete()
      .eq('id', aliceExpenseId)
      .select('id');
    expect(remove.data).toEqual([]);

    const { data } = await createAdminClient()
      .from('fixed_expenses')
      .select('amount')
      .eq('id', aliceExpenseId)
      .single();
    expect(data?.amount).toBe(55000);
  });

  it('다른 사람 이름으로 만들 수 없다', async () => {
    const { error } = await bob.client
      .from('fixed_expenses')
      .insert(fixedExpenseRow({ day: 5, user_id: alice.userId }));
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it('DB가 매달 규칙·날짜 범위·금액을 검사한다', async () => {
    const weekly = await alice.client.from('fixed_expenses').insert({
      ...fixedExpenseRow({ day: 5 }),
      schedule: { kind: 'weekly', days: [1] },
    });
    expect(weekly.error?.code).toBe(CHECK_VIOLATION);

    const day32 = await alice.client
      .from('fixed_expenses')
      .insert(fixedExpenseRow({ day: 32 }));
    expect(day32.error?.code).toBe(CHECK_VIOLATION);

    const dayText = await alice.client.from('fixed_expenses').insert({
      ...fixedExpenseRow({ day: 5 }),
      schedule: { kind: 'monthly', day: 'x' },
    });
    expect(dayText.error?.code).toBe(CHECK_VIOLATION);

    const zero = await alice.client
      .from('fixed_expenses')
      .insert(fixedExpenseRow({ day: 5, amount: 0 }));
    expect(zero.error?.code).toBe(CHECK_VIOLATION);
  });

  it('자동 기록 함수는 사용자가 API로 부를 수 없다 (남의 줄까지 처리하는 함수)', async () => {
    const { error } = await alice.client.rpc('record_due_fixed_expenses', {
      p_today: '2026-10-05',
    });
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it('해지 = 본인은 지울 수 있다', async () => {
    const { data: extra } = await alice.client
      .from('fixed_expenses')
      .insert(fixedExpenseRow({ day: 9, name: '지울 것' }))
      .select('id')
      .single();
    const { data, error } = await alice.client
      .from('fixed_expenses')
      .delete()
      .eq('id', extra!.id)
      .select('id');
    expect(error).toBeNull();
    expect(data).toEqual([{ id: extra!.id }]);
  });
});

describe.skipIf(!hasTestSupabase)('고정지출 자동 기록 (pg_cron 함수)', () => {
  let guest: TestGuest;

  beforeAll(async () => {
    guest = await signInAsNewGuest();
  });
  afterAll(() => deleteGuests(guest));

  async function addFixedExpense(
    values: Partial<TablesInsert<'fixed_expenses'>> & { day: number },
  ): Promise<string> {
    const { data, error } = await guest.client
      .from('fixed_expenses')
      .insert(fixedExpenseRow(values))
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  it('결제일 전에는 만들지 않고, 결제일에 가계부 기록 하나 (고정지출 태그, 결제수단 없으면 칸 없음)', async () => {
    await addFixedExpense({ day: 5, name: '통신비' });

    await runDailyJob('2026-10-04');
    expect(await autoRecordsOf(guest)).toEqual([]);

    await runDailyJob('2026-10-05');
    expect(await autoRecordsOf(guest)).toEqual([
      {
        type: 'expense',
        occurred_at: '2026-10-05',
        title: '통신비',
        tags: ['고정지출'],
        fields: { amount: 55000, category: '생활' },
      },
    ]);
  });

  it('여러 번 돌아도 한 달에 한 번. 결제일을 바꿔도 같은 달에 다시 만들지 않는다', async () => {
    await runDailyJob('2026-10-05');
    await runDailyJob('2026-10-20');
    expect(await autoRecordsOf(guest)).toHaveLength(1);

    // 10일에 결제일을 20일로 바꿈 → 10월은 이미 기록했으니 그대로, 11월은 20일에
    await guest.client
      .from('fixed_expenses')
      .update({ schedule: { kind: 'monthly', day: 20 } })
      .eq('name', '통신비');
    await runDailyJob('2026-10-20');
    expect(await autoRecordsOf(guest)).toHaveLength(1);

    await runDailyJob('2026-11-20');
    const records = await autoRecordsOf(guest);
    expect(records.map((record) => record.occurred_at)).toEqual([
      '2026-10-05',
      '2026-11-20',
    ]);
  });

  it('31일 규칙은 30일까지 있는 달에 말일, 결제수단은 fields에 들어간다', async () => {
    await addFixedExpense({
      day: 31,
      name: '보험료',
      payment_method: '계좌이체',
      start_date: '2026-11-01',
    });
    await runDailyJob('2026-11-30');

    const insurance = (await autoRecordsOf(guest)).filter(
      (record) => record.title === '보험료',
    );
    expect(insurance).toEqual([
      expect.objectContaining({
        occurred_at: '2026-11-30',
        fields: { amount: 55000, category: '생활', paymentMethod: '계좌이체' },
      }),
    ]);
  });

  it('추가한 날보다 앞선 이번 달 결제일은 만들지 않고 다음 달부터 (2026-10-23 사용자 결정)', async () => {
    await addFixedExpense({ day: 3, name: '월세', start_date: '2026-12-10' });

    await runDailyJob('2026-12-10');
    await runDailyJob('2026-12-31');
    const rentOf = async () =>
      (await autoRecordsOf(guest)).filter((record) => record.title === '월세');
    expect(await rentOf()).toEqual([]);

    await runDailyJob('2027-01-03');
    expect((await rentOf()).map((record) => record.occurred_at)).toEqual([
      '2027-01-03',
    ]);
  });

  it('서버가 그날 멈춰 있었어도 같은 달 안에는 따라잡는다 (occurred_at은 결제일)', async () => {
    await addFixedExpense({ day: 7, name: '구독', start_date: '2027-02-01' });
    // 7일에는 돌지 않고 15일에 처음 돈다
    await runDailyJob('2027-02-15');
    const subscription = (await autoRecordsOf(guest)).filter(
      (record) => record.title === '구독',
    );
    expect(subscription.map((record) => record.occurred_at)).toEqual([
      '2027-02-07',
    ]);
  });

  it('만든 기록은 주인에게 보인다 (RLS: 서버가 user_id를 채웠다)', async () => {
    const { data } = await guest.client
      .from('records')
      .select('title')
      .contains('tags', ['고정지출']);
    expect(data?.length).toBeGreaterThan(0);
  });
});
