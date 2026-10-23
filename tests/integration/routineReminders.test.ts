import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TablesInsert } from '@/lib/supabase/database.types';
import {
  createAdminClient,
  deleteGuests,
  hasTestSupabase,
  newRoutineRow,
  signInAsNewGuest,
  type TestGuest,
} from './testSupabase';

// 35b 지금 알릴 루틴 고르기 (claim_due_routine_reminders, Edge Function이 10분마다 부른다).
// 함수는 모든 사용자의 루틴을 처리하므로, 확인은 늘 이 테스트가 만든 루틴 id로만 본다.
// 시각은 p_now로 정한다: 한국 시각 = UTC + 9시간

const kst = (date: string, time: string) =>
  new Date(`${date}T${time}:00+09:00`).toISOString();

async function claim(
  now: string,
): Promise<{ routine_id: string; done_count: number; day: string }[]> {
  const { data, error } = await createAdminClient().rpc(
    'claim_due_routine_reminders',
    { p_now: now },
  );
  if (error) throw error;
  return data;
}

async function claimedIds(now: string, ids: string[]): Promise<string[]> {
  return (await claim(now))
    .map((row) => row.routine_id)
    .filter((id) => ids.includes(id));
}

function checkRow(
  routineId: string,
  date: string,
  count: number,
  target: number,
): TablesInsert<'records'> {
  return {
    type: 'routine',
    occurred_at: date,
    title: '루틴',
    memo: null,
    tags: [],
    fields: { routineId, count, target, unit: '잔' },
  };
}

describe.skipIf(!hasTestSupabase)('지금 알릴 루틴 고르기', () => {
  let alice: TestGuest;

  async function addRoutine(
    values: Partial<TablesInsert<'routines'>>,
  ): Promise<string> {
    const row = { ...newRoutineRow('알림 루틴'), ...values };
    const { error } = await alice.client.from('routines').insert(row);
    if (error) throw error;
    return row.id;
  }

  const everyDay = { kind: 'weekly', days: [0, 1, 2, 3, 4, 5, 6] };

  beforeAll(async () => {
    alice = await signInAsNewGuest();
  });

  afterAll(() => deleteGuests(alice));

  it('알림 시각부터 30분 안에만, 하루 한 번만 (겹쳐 돌아도)', async () => {
    const id = await addRoutine({ schedule: everyDay, remind_at: '09:00' });
    const day = '2026-10-23';

    expect(await claimedIds(kst(day, '08:55'), [id])).toEqual([]);
    expect(await claimedIds(kst(day, '09:40'), [id])).toEqual([]);
    expect(await claimedIds(kst(day, '09:05'), [id])).toEqual([id]);
    // 다음 10분 실행: 이미 보냈다
    expect(await claimedIds(kst(day, '09:15'), [id])).toEqual([]);
    // 다음 날은 다시
    expect(await claimedIds(kst('2026-10-24', '09:00'), [id])).toEqual([id]);
  });

  it('오늘 목표를 채웠으면 안 보내고, 일부만 했으면 한 만큼 담아 보낸다', async () => {
    const done = await addRoutine({ schedule: everyDay, remind_at: '20:00' });
    const partial = await addRoutine({
      schedule: everyDay,
      remind_at: '20:00',
    });
    const day = '2026-10-25';
    await alice.client
      .from('records')
      .insert([checkRow(done, day, 8, 8), checkRow(partial, day, 3, 8)]);

    const rows = (await claim(kst(day, '20:00'))).filter((row) =>
      [done, partial].includes(row.routine_id),
    );
    expect(rows).toEqual([
      expect.objectContaining({ routine_id: partial, done_count: 3, day }),
    ]);
  });

  it('오늘 일정이 아닌 요일, 시작 전, 그만둔 루틴은 안 보낸다', async () => {
    // 2026-10-26 = 월요일
    const weekend = await addRoutine({
      schedule: { kind: 'weekly', days: [0, 6] },
      remind_at: '07:00',
    });
    const notStarted = await addRoutine({
      schedule: everyDay,
      start_date: '2026-10-27',
      remind_at: '07:00',
    });
    const ended = await addRoutine({
      schedule: everyDay,
      ended_on: '2026-10-26',
      remind_at: '07:00',
    });
    const ids = [weekend, notStarted, ended];
    expect(await claimedIds(kst('2026-10-26', '07:00'), ids)).toEqual([]);
  });

  it('매달 31일은 짧은 달의 말일에 (앱 반복 규칙과 같다)', async () => {
    const id = await addRoutine({
      schedule: { kind: 'monthly', day: 31 },
      remind_at: '12:00',
    });
    expect(await claimedIds(kst('2026-11-29', '12:00'), [id])).toEqual([]);
    expect(await claimedIds(kst('2026-11-30', '12:00'), [id])).toEqual([id]);
  });

  it('자정 알림도 빠지지 않는다 (00:00 알림을 00:05에)', async () => {
    const id = await addRoutine({ schedule: everyDay, remind_at: '00:00' });
    expect(await claimedIds(kst('2026-12-01', '00:05'), [id])).toEqual([id]);
  });

  it('사용자는 이 함수를 부를 수 없다 (모든 사람의 루틴을 읽는다)', async () => {
    const { error } = await alice.client.rpc('claim_due_routine_reminders', {
      p_now: kst('2026-10-23', '09:00'),
    });
    expect(error).not.toBeNull();
  });
});
