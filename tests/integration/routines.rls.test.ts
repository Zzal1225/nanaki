import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createAdminClient,
  createSignedOutClient,
  deleteGuests,
  hasTestSupabase,
  newRoutineRow,
  signInAsNewGuest,
  type TestGuest,
} from './testSupabase';

// Postgres "권한 없음" 오류 코드. RLS with check에 걸리거나 표 권한이 없을 때
const INSUFFICIENT_PRIVILEGE = '42501';
// check 제약 위반
const CHECK_VIOLATION = '23514';

// 루틴(반복 규칙) 표도 records와 같은 규칙으로 격리되는지, 그리고 이 표만의 규칙
// (삭제 권한 없음 = 그만두기만, DB가 반복·목표 종류를 막음, 계정 삭제 때 함께 지워짐)을 확인한다
describe.skipIf(!hasTestSupabase)('routines RLS: 사용자 격리', () => {
  let alice: TestGuest;
  let bob: TestGuest;
  const aliceRoutine = newRoutineRow('앨리스의 물 마시기');

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAsNewGuest(), signInAsNewGuest()]);
    const { error } = await alice.client.from('routines').insert(aliceRoutine);
    if (error) throw error;
  });

  afterAll(() => deleteGuests(alice, bob));

  async function readAliceRoutineAsAdmin() {
    const { data } = await createAdminClient()
      .from('routines')
      .select('name, user_id, ended_on')
      .eq('id', aliceRoutine.id)
      .maybeSingle();
    return data;
  }

  it('본인은 자기 루틴을 읽는다 (테스트 준비가 맞는지)', async () => {
    const { data } = await alice.client
      .from('routines')
      .select('id')
      .eq('id', aliceRoutine.id);
    expect(data).toHaveLength(1);
  });

  it('다른 사람의 루틴은 보이지 않고, 고칠 수도 없다', async () => {
    const read = await bob.client.from('routines').select('id');
    expect(read.data).toEqual([]);

    const update = await bob.client
      .from('routines')
      .update({ name: '밥이 바꿈', ended_on: '2026-10-21' })
      .eq('id', aliceRoutine.id)
      .select('id');
    expect(update.data).toEqual([]);
    expect(await readAliceRoutineAsAdmin()).toMatchObject({
      name: '앨리스의 물 마시기',
      ended_on: null,
    });
  });

  it('다른 사람 이름으로 만들 수 없고, 내 루틴의 주인을 바꿀 수도 없다', async () => {
    const insert = await bob.client
      .from('routines')
      .insert({ ...newRoutineRow('가짜'), user_id: alice.userId });
    expect(insert.error?.code).toBe(INSUFFICIENT_PRIVILEGE);

    const update = await alice.client
      .from('routines')
      .update({ user_id: bob.userId })
      .eq('id', aliceRoutine.id);
    expect(update.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    expect((await readAliceRoutineAsAdmin())?.user_id).toBe(alice.userId);
  });

  // 지난 체크 기록과 달성률이 이 규칙을 기준으로 계산되므로 줄을 지우지 않고 그만두게만 한다
  it('본인도 루틴을 지울 수 없다 (삭제 권한 없음, 그만두기만)', async () => {
    const { error } = await alice.client
      .from('routines')
      .delete()
      .eq('id', aliceRoutine.id);
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    expect(await readAliceRoutineAsAdmin()).not.toBeNull();
  });

  it('DB가 반복·목표의 종류와 그만둔 날을 검사한다', async () => {
    const badSchedule = await alice.client.from('routines').insert({
      ...newRoutineRow('잘못된 반복'),
      schedule: { kind: 'yearly' },
    });
    expect(badSchedule.error?.code).toBe(CHECK_VIOLATION);

    const badGoal = await alice.client.from('routines').insert({
      ...newRoutineRow('잘못된 목표'),
      goal: { kind: 'minutes' },
    });
    expect(badGoal.error?.code).toBe(CHECK_VIOLATION);

    // 시작하기 전에 그만둘 수는 없다
    const endedBeforeStart = await alice.client.from('routines').insert({
      ...newRoutineRow('거꾸로'),
      start_date: '2026-10-21',
      ended_on: '2026-10-20',
    });
    expect(endedBeforeStart.error?.code).toBe(CHECK_VIOLATION);
  });

  it('로그인하지 않은 사람은 루틴 표를 읽을 수 없다', async () => {
    const { data, error } = await createSignedOutClient()
      .from('routines')
      .select('id');
    expect(error?.code ?? null).toSatisfy(
      (code: string | null) => code === INSUFFICIENT_PRIVILEGE || code === null,
    );
    expect(data ?? []).toEqual([]);
  });

  it('계정을 지우면 루틴도 함께 지워진다 (on delete cascade)', async () => {
    const carol = await signInAsNewGuest();
    const routine = newRoutineRow('캐럴의 루틴');
    await carol.client.from('routines').insert(routine);

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(carol.userId);
    expect(error).toBeNull();

    const { data } = await admin
      .from('routines')
      .select('id')
      .eq('id', routine.id);
    expect(data).toEqual([]);
  });
});
