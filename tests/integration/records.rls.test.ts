import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createAdminClient,
  createSignedOutClient,
  deleteGuests,
  hasTestSupabase,
  newRecordRow,
  signInAsNewGuest,
  type TestGuest,
} from './testSupabase';

// Postgres "권한 없음" 오류 코드. RLS with check에 걸리거나 표 권한이 없을 때
const INSUFFICIENT_PRIVILEGE = '42501';

// 앱 코드(recordStore)는 "내 기록만" 조건을 쓰지 않는다. 다른 사람의 기록이 안 보이는 건 오직 DB의 RLS 덕분이라,
// 앱을 거치지 않고 공개 키로 API를 직접 부르는 상황을 그대로 만들어 확인한다.
// 앨리스가 기록을 쓰고, 밥이 그 기록을 읽기·고치기·지우기·가로채기를 시도한다
describe.skipIf(!hasTestSupabase)('records RLS: 사용자 격리', () => {
  let alice: TestGuest;
  let bob: TestGuest;
  const aliceRecord = newRecordRow('앨리스의 점심');

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAsNewGuest(), signInAsNewGuest()]);
    const { error } = await alice.client.from('records').insert(aliceRecord);
    if (error) throw error;
  });

  afterAll(() => deleteGuests(alice, bob));

  // 밥이 시도한 뒤에도 앨리스의 기록이 그대로인지는 RLS를 무시하는 관리자로 확인한다
  async function readAliceRecordAsAdmin() {
    const { data } = await createAdminClient()
      .from('records')
      .select('title, deleted_at, user_id')
      .eq('id', aliceRecord.id)
      .single();
    return data;
  }

  it('본인은 자기 기록을 읽는다 (테스트 준비가 맞는지)', async () => {
    const { data } = await alice.client
      .from('records')
      .select('id')
      .eq('id', aliceRecord.id);
    expect(data).toHaveLength(1);
  });

  it('다른 사람의 기록은 id를 알아도 보이지 않는다', async () => {
    const byId = await bob.client
      .from('records')
      .select('id')
      .eq('id', aliceRecord.id);
    expect(byId.data).toEqual([]);

    // 조건 없이 전부 달라고 해도 밥 자신의 기록(없음)만
    const all = await bob.client.from('records').select('id');
    expect(all.data).toEqual([]);
  });

  it('다른 사람의 기록을 고칠 수 없다 (0줄, 원본 그대로)', async () => {
    const { data } = await bob.client
      .from('records')
      .update({ title: '밥이 바꿈' })
      .eq('id', aliceRecord.id)
      .select('id');
    expect(data).toEqual([]);
    expect((await readAliceRecordAsAdmin())?.title).toBe('앨리스의 점심');
  });

  it('다른 사람의 기록을 지울 수 없다 (소프트 삭제·실제 삭제 모두)', async () => {
    const softDelete = await bob.client
      .from('records')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', aliceRecord.id)
      .select('id');
    expect(softDelete.data).toEqual([]);

    const hardDelete = await bob.client
      .from('records')
      .delete()
      .eq('id', aliceRecord.id)
      .select('id');
    expect(hardDelete.data).toEqual([]);

    const record = await readAliceRecordAsAdmin();
    expect(record).not.toBeNull();
    expect(record?.deleted_at).toBeNull();
  });

  it('다른 사람 이름(user_id)으로 기록을 만들 수 없다', async () => {
    const { error } = await bob.client
      .from('records')
      .insert({ ...newRecordRow('가짜'), user_id: alice.userId });
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  // 정책의 with check가 없으면 내 기록을 고치면서 주인을 남으로 바꿔 넘길 수 있다
  it('내 기록의 주인을 다른 사람으로 바꿀 수 없다', async () => {
    const { error } = await alice.client
      .from('records')
      .update({ user_id: bob.userId })
      .eq('id', aliceRecord.id);
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    expect((await readAliceRecordAsAdmin())?.user_id).toBe(alice.userId);
  });

  it('로그인하지 않은 사람은 기록 표를 읽을 수 없다', async () => {
    const { data, error } = await createSignedOutClient()
      .from('records')
      .select('id');
    // anon 역할에는 표 권한 자체가 없어 오류가 나거나, 있더라도 빈 결과여야 한다
    expect(error?.code ?? null).toSatisfy(
      (code: string | null) => code === INSUFFICIENT_PRIVILEGE || code === null,
    );
    expect(data ?? []).toEqual([]);
  });
});
