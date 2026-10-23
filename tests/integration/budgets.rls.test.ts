import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createAdminClient,
  createSignedOutClient,
  deleteGuests,
  hasTestSupabase,
  signInAsNewGuest,
  type TestGuest,
} from './testSupabase';

// Postgres "권한 없음" 오류 코드. RLS with check에 걸리거나 표 권한이 없을 때
const INSUFFICIENT_PRIVILEGE = '42501';
const CHECK_VIOLATION = '23514';

// 예산 표(step3)가 records·routines와 같은 규칙으로 격리되는지, 그리고 이 표만의 규칙
// (한 사람·한 달에 한 줄이라 upsert로 고침, 삭제 정책 없음, DB가 달 모양·금액·객체를 막음, 계정 삭제 때 함께 지워짐)
describe.skipIf(!hasTestSupabase)('budgets RLS: 사용자 격리', () => {
  let alice: TestGuest;
  let bob: TestGuest;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAsNewGuest(), signInAsNewGuest()]);
    const { error } = await alice.client.from('budgets').insert({
      month: '2026-10',
      total_amount: 600000,
      category_amounts: { 식비: 300000 },
    });
    if (error) throw error;
  });

  afterAll(() => deleteGuests(alice, bob));

  async function readAliceBudgetAsAdmin() {
    const { data } = await createAdminClient()
      .from('budgets')
      .select('total_amount, user_id')
      .eq('user_id', alice.userId)
      .eq('month', '2026-10')
      .maybeSingle();
    return data;
  }

  it('같은 달을 다시 저장하면(upsert) 줄이 늘지 않고 고쳐진다', async () => {
    const { error } = await alice.client
      .from('budgets')
      .upsert({ month: '2026-10', total_amount: 650000, category_amounts: {} });
    expect(error).toBeNull();
    const { data } = await alice.client
      .from('budgets')
      .select('month, total_amount');
    expect(data).toEqual([{ month: '2026-10', total_amount: 650000 }]);
  });

  it('다른 사람의 예산은 보이지 않고, 고칠 수도 없다', async () => {
    const read = await bob.client.from('budgets').select('month');
    expect(read.data).toEqual([]);

    const update = await bob.client
      .from('budgets')
      .update({ total_amount: 1 })
      .eq('user_id', alice.userId)
      .select('month');
    expect(update.data).toEqual([]);
    expect((await readAliceBudgetAsAdmin())?.total_amount).toBe(650000);
  });

  it('다른 사람 이름으로 만들 수 없다', async () => {
    const insert = await bob.client.from('budgets').insert({
      user_id: alice.userId,
      month: '2026-11',
      total_amount: 1,
    });
    expect(insert.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  // routines와 같은 이유: 삭제 정책이 없으면 지울 수 있는 줄이 0줄 (오류 없이 아무것도 지워지지 않는다)
  it('본인도 예산 줄을 지울 수 없다 (비우려면 비운 값으로 저장)', async () => {
    const { data, error } = await alice.client
      .from('budgets')
      .delete()
      .eq('month', '2026-10')
      .select('month');
    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(await readAliceBudgetAsAdmin()).not.toBeNull();
  });

  it('DB가 달 모양·금액 범위·분류 예산 모양을 검사한다', async () => {
    const badMonth = await alice.client
      .from('budgets')
      .insert({ month: '2026-13', total_amount: 1000 });
    expect(badMonth.error?.code).toBe(CHECK_VIOLATION);

    const badAmount = await alice.client
      .from('budgets')
      .insert({ month: '2026-12', total_amount: 0 });
    expect(badAmount.error?.code).toBe(CHECK_VIOLATION);

    const badCategories = await alice.client
      .from('budgets')
      .insert({ month: '2026-12', category_amounts: [1, 2] });
    expect(badCategories.error?.code).toBe(CHECK_VIOLATION);
  });

  it('로그인하지 않은 사람은 예산 표를 읽을 수 없다', async () => {
    const { data, error } = await createSignedOutClient()
      .from('budgets')
      .select('month');
    expect(error?.code ?? null).toSatisfy(
      (code: string | null) => code === INSUFFICIENT_PRIVILEGE || code === null,
    );
    expect(data ?? []).toEqual([]);
  });

  it('계정을 지우면 예산도 함께 지워진다 (on delete cascade)', async () => {
    const carol = await signInAsNewGuest();
    await carol.client
      .from('budgets')
      .insert({ month: '2026-10', total_amount: 1000 });

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(carol.userId);
    expect(error).toBeNull();

    const { data } = await admin
      .from('budgets')
      .select('month')
      .eq('user_id', carol.userId);
    expect(data).toEqual([]);
  });
});
