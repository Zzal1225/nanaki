import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createAdminClient,
  deleteGuests,
  hasTestSupabase,
  newRecordRow,
  signInAsNewGuest,
  type TestGuest,
} from './testSupabase';

const INSUFFICIENT_PRIVILEGE = '42501';

// 설정 표(user_settings)의 격리, 계정을 지울 때 함께 지워지는지(cascade),
// 체험 계정 정리 함수를 사용자가 API로 부를 수 없는지를 진짜 DB에서 확인한다
describe.skipIf(!hasTestSupabase)('user_settings RLS · 계정 삭제', () => {
  let alice: TestGuest;
  let bob: TestGuest;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAsNewGuest(), signInAsNewGuest()]);
    const { error } = await alice.client
      .from('user_settings')
      .upsert({ hidden_types: ['review'] });
    if (error) throw error;
  });

  afterAll(() => deleteGuests(alice, bob));

  it('설정 줄이 없으면 처음 저장할 때 만들어지고, 다시 저장하면 고쳐진다 (upsert)', async () => {
    const { data, error } = await alice.client
      .from('user_settings')
      .upsert({ hidden_types: [] })
      .select('user_id, hidden_types')
      .single();
    expect(error).toBeNull();
    expect(data).toEqual({ user_id: alice.userId, hidden_types: [] });
    // 원래대로
    await alice.client
      .from('user_settings')
      .upsert({ hidden_types: ['review'] });
  });

  it('다른 사람의 설정은 보이지 않고 고칠 수 없다', async () => {
    const read = await bob.client.from('user_settings').select('user_id');
    expect(read.data).toEqual([]);

    const update = await bob.client
      .from('user_settings')
      .update({ hidden_types: [] })
      .eq('user_id', alice.userId)
      .select('user_id');
    expect(update.data).toEqual([]);

    const forged = await bob.client
      .from('user_settings')
      .insert({ user_id: alice.userId, hidden_types: [] });
    expect(forged.error?.code).toBeDefined();
  });

  it('모르는 타입 이름은 DB가 막는다 (check 제약)', async () => {
    const { error } = await alice.client
      .from('user_settings')
      .upsert({ hidden_types: ['unknown'] });
    // check_violation
    expect(error?.code).toBe('23514');
  });

  it('체험 계정 정리 함수는 사용자가 API로 부를 수 없다', async () => {
    const { error } = await alice.client.rpc('delete_expired_guests');
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it('계정을 지우면 기록·설정이 함께 지워진다 (on delete cascade)', async () => {
    // 이 테스트만을 위한 사용자 (위의 앨리스·밥은 afterAll이 정리)
    const carol = await signInAsNewGuest();
    await carol.client.from('records').insert(newRecordRow('캐럴의 기록'));
    await carol.client.from('user_settings').upsert({ hidden_types: [] });

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(carol.userId);
    expect(error).toBeNull();

    const records = await admin
      .from('records')
      .select('id')
      .eq('user_id', carol.userId);
    const settings = await admin
      .from('user_settings')
      .select('user_id')
      .eq('user_id', carol.userId);
    expect(records.data).toEqual([]);
    expect(settings.data).toEqual([]);
  });
});
