import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TablesInsert } from '@/lib/supabase/database.types';
import {
  deleteGuests,
  hasTestSupabase,
  signInAsNewGuest,
  type TestGuest,
} from './testSupabase';

// Postgres 고유 제약 위반
const UNIQUE_VIOLATION = '23505';

function checkRow(
  routineId: string,
  date: string,
  count: number,
): TablesInsert<'records'> & { id: string } {
  return {
    id: crypto.randomUUID(),
    type: 'routine',
    occurred_at: date,
    title: '물 마시기',
    memo: null,
    tags: [],
    fields: { routineId, count, target: 8, unit: '잔' },
  };
}

// 루틴 체크는 루틴 하나 × 하루 = 한 줄 (records_routine_check_unique 부분 고유 색인).
// 두 기기가 동시에 "없음"을 보고 둘 다 만들 때 DB가 둘째를 막는지, 막지 말아야 할 경우는 통과하는지 본다
describe.skipIf(!hasTestSupabase)('루틴 체크: 루틴·날짜마다 한 줄', () => {
  let alice: TestGuest;
  let bob: TestGuest;
  const routineId = crypto.randomUUID();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAsNewGuest(), signInAsNewGuest()]);
  });
  afterAll(() => deleteGuests(alice, bob));

  it('같은 루틴·같은 날 두 번째 줄은 막힌다', async () => {
    const first = await alice.client
      .from('records')
      .insert(checkRow(routineId, '2026-10-21', 3));
    expect(first.error).toBeNull();

    const second = await alice.client
      .from('records')
      .insert(checkRow(routineId, '2026-10-21', 4));
    expect(second.error?.code).toBe(UNIQUE_VIOLATION);
  });

  it('다른 날, 다른 사람(같은 루틴 id라도)은 막지 않는다', async () => {
    const otherDay = await alice.client
      .from('records')
      .insert(checkRow(routineId, '2026-10-22', 1));
    expect(otherDay.error).toBeNull();

    const otherUser = await bob.client
      .from('records')
      .insert(checkRow(routineId, '2026-10-21', 1));
    expect(otherUser.error).toBeNull();
  });

  // 체크를 풀면 소프트 삭제라 줄이 남는다. 지운 줄은 색인에서 빠져야 다시 체크할 수 있다
  it('지운(체크를 푼) 줄이 있어도 다시 체크할 수 있다', async () => {
    const row = checkRow(routineId, '2026-10-23', 2);
    await alice.client.from('records').insert(row);
    await alice.client
      .from('records')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', row.id);

    const again = await alice.client
      .from('records')
      .insert(checkRow(routineId, '2026-10-23', 1));
    expect(again.error).toBeNull();
  });

  it('루틴 체크가 아닌 기록은 하루에 여러 줄이어도 된다', async () => {
    const expense = (title: string) => ({
      id: crypto.randomUUID(),
      type: 'expense',
      occurred_at: '2026-10-21',
      title,
      memo: null,
      tags: [],
      fields: { amount: 1000, category: '식비', routineId },
    });
    const result = await alice.client
      .from('records')
      .insert([expense('점심'), expense('저녁')]);
    expect(result.error).toBeNull();
  });
});
