import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createAdminClient,
  deleteGuests,
  hasTestSupabase,
  signInAsNewGuest,
  type TestGuest,
} from './testSupabase';

const INSUFFICIENT_PRIVILEGE = '42501';
// 체험(익명) 계정의 하루 한도 (DB 함수 ai_daily_limit). 일반 계정은 20
const GUEST_DAILY_LIMIT = 10;

// AI 나키 하루 횟수 (step3). 한도를 서버가 세는지, 사용자가 우회할 수 없는지 (세기는 함수로만, 되돌리기는 관리자만)
describe.skipIf(!hasTestSupabase)('ai_usage: 하루 횟수', () => {
  let alice: TestGuest;
  let bob: TestGuest;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAsNewGuest(), signInAsNewGuest()]);
  });
  afterAll(() => deleteGuests(alice, bob));

  it('처음에는 한도 그대로 (체험 계정 10회)', async () => {
    const { data, error } = await alice.client.rpc('get_ai_quota');
    expect(error).toBeNull();
    expect(data).toEqual([
      { remaining: GUEST_DAILY_LIMIT, day_limit: GUEST_DAILY_LIMIT },
    ]);
  });

  it('한도까지 쓰면 남은 횟수가 줄고, 넘으면 -1 (더 늘지 않는다)', async () => {
    const remainings: number[] = [];
    for (let i = 0; i < GUEST_DAILY_LIMIT; i += 1) {
      const { data, error } = await alice.client.rpc('use_ai_quota');
      expect(error).toBeNull();
      remainings.push(data!);
    }
    expect(remainings).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);

    const over = await alice.client.rpc('use_ai_quota');
    expect(over.data).toBe(-1);
    const { data } = await alice.client.rpc('get_ai_quota');
    expect(data?.[0].remaining).toBe(0);
  });

  it('사용자는 되돌리기를 부를 수 없고, 표를 직접 고칠 수도 없다 (한도 우회 막기)', async () => {
    const refund = await alice.client.rpc('refund_ai_quota', {
      p_user_id: alice.userId,
    });
    expect(refund.error?.code).toBe(INSUFFICIENT_PRIVILEGE);

    const update = await alice.client
      .from('ai_usage')
      .update({ count: 0 })
      .eq('user_id', alice.userId)
      .select('count');
    expect(update.error?.code ?? null).toSatisfy(
      (code: string | null) => code === INSUFFICIENT_PRIVILEGE || code === null,
    );
    expect(update.data ?? []).toEqual([]);

    const remove = await alice.client
      .from('ai_usage')
      .delete()
      .eq('user_id', alice.userId)
      .select('count');
    expect(remove.data ?? []).toEqual([]);

    const { data } = await alice.client.rpc('get_ai_quota');
    expect(data?.[0].remaining).toBe(0);
  });

  it('서버(관리자 키)는 AI 실패 때 1회 되돌린다', async () => {
    const { error } = await createAdminClient().rpc('refund_ai_quota', {
      p_user_id: alice.userId,
    });
    expect(error).toBeNull();
    const { data } = await alice.client.rpc('get_ai_quota');
    expect(data?.[0].remaining).toBe(1);
  });

  it('다른 사람의 사용량은 보이지 않고, 남의 한도에 영향이 없다', async () => {
    const read = await bob.client.from('ai_usage').select('count');
    expect(read.data).toEqual([]);
    const { data } = await bob.client.rpc('get_ai_quota');
    expect(data?.[0].remaining).toBe(GUEST_DAILY_LIMIT);
  });
});
