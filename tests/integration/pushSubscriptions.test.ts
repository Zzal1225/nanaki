import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  deleteGuests,
  hasTestSupabase,
  newRoutineRow,
  signInAsNewGuest,
  type TestGuest,
} from './testSupabase';

// check 제약 위반
const CHECK_VIOLATION = '23514';

// 35a 루틴 알림: 알림 시각(10분 단위)과 기기별 푸시 구독.
// 구독은 저장 함수(save_push_subscription)로만 넣고, 같은 기기 주소가 다른 계정에 남아 있으면 지금 계정으로 옮긴다
// (공용 기기에서 앞 사람의 알림이 뜨지 않게)

function subscriptionArgs(endpoint: string) {
  return { p_endpoint: endpoint, p_p256dh: 'p256dh-key', p_auth: 'auth-key' };
}

const newEndpoint = () => `https://push.example.test/${crypto.randomUUID()}`;

describe.skipIf(!hasTestSupabase)('루틴 알림 시각 (10분 단위)', () => {
  let alice: TestGuest;

  beforeAll(async () => {
    alice = await signInAsNewGuest();
  });

  afterAll(() => deleteGuests(alice));

  it('10분 단위 시각은 받고, 그 밖은 DB가 막는다', async () => {
    const ok = await alice.client
      .from('routines')
      .insert({ ...newRoutineRow('물'), remind_at: '21:30' })
      .select('remind_at')
      .single();
    expect(ok.error).toBeNull();
    expect(ok.data?.remind_at).toBe('21:30:00');

    const bad = await alice.client
      .from('routines')
      .insert({ ...newRoutineRow('물'), remind_at: '21:35' });
    expect(bad.error?.code).toBe(CHECK_VIOLATION);
  });
});

describe.skipIf(!hasTestSupabase)('push_subscriptions: 기기별 구독', () => {
  let alice: TestGuest;
  let bob: TestGuest;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAsNewGuest(), signInAsNewGuest()]);
  });

  afterAll(() => deleteGuests(alice, bob));

  it('저장 함수로 넣고 본인 것만 보인다', async () => {
    const endpoint = newEndpoint();
    const saved = await alice.client.rpc(
      'save_push_subscription',
      subscriptionArgs(endpoint),
    );
    expect(saved.error).toBeNull();

    const mine = await alice.client
      .from('push_subscriptions')
      .select('endpoint, user_id');
    expect(mine.data).toEqual([{ endpoint, user_id: alice.userId }]);
    const others = await bob.client.from('push_subscriptions').select('id');
    expect(others.data).toEqual([]);
  });

  it('표에 직접 넣을 수는 없다 (저장 함수로만)', async () => {
    const direct = await alice.client.from('push_subscriptions').insert({
      endpoint: newEndpoint(),
      p256dh: 'k',
      auth: 'a',
    });
    expect(direct.error).not.toBeNull();
  });

  it('같은 기기 주소를 다른 계정이 저장하면 그 계정으로 옮긴다 (앞 사람 줄은 사라진다)', async () => {
    const shared = newEndpoint();
    await alice.client.rpc('save_push_subscription', subscriptionArgs(shared));
    await bob.client.rpc('save_push_subscription', subscriptionArgs(shared));

    const aliceRows = await alice.client
      .from('push_subscriptions')
      .select('endpoint')
      .eq('endpoint', shared);
    expect(aliceRows.data).toEqual([]);
    const bobRows = await bob.client
      .from('push_subscriptions')
      .select('endpoint')
      .eq('endpoint', shared);
    expect(bobRows.data).toEqual([{ endpoint: shared }]);
  });

  it('본인 구독은 지우고, 다른 사람 것은 지울 수 없다', async () => {
    const endpoint = newEndpoint();
    await alice.client.rpc(
      'save_push_subscription',
      subscriptionArgs(endpoint),
    );

    const byBob = await bob.client
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .select('id');
    expect(byBob.data).toEqual([]);

    const byAlice = await alice.client
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .select('id');
    expect(byAlice.data).toHaveLength(1);
  });

  it('https가 아닌 주소는 DB가 막는다', async () => {
    const saved = await alice.client.rpc(
      'save_push_subscription',
      subscriptionArgs('http://push.example.test/x'),
    );
    expect(saved.error?.code).toBe(CHECK_VIOLATION);
  });
});
