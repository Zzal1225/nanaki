import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { toAfterCursorFilter } from '@/lib/db/sync';
import type { SyncCursor } from '@/lib/db/localDb';
import {
  deleteGuests,
  hasTestSupabase,
  newRecordRow,
  signInAsNewGuest,
  type TestGuest,
} from './testSupabase';

// 기기 사본 동기화의 커서 조건(toAfterCursorFilter)을 진짜 PostgREST에 보낸다.
// 단위 테스트로는 "이런 글자를 만든다"까지만 알 수 있고, 시각 값의 따옴표(: + .)를 서버가 그렇게 읽는지는 여기서만 확인된다
describe.skipIf(!hasTestSupabase)('동기화 커서', () => {
  let guest: TestGuest;
  const PAGE = 2;

  beforeAll(async () => {
    guest = await signInAsNewGuest();
    // insert 한 번 = 한 트랜잭션 → updated_at(now())이 다섯 줄 모두 같다. 페이지 경계가 같은 시각 한가운데에 생긴다
    const rows = ['가', '나', '다', '라', '마'].map(newRecordRow);
    const { error } = await guest.client.from('records').insert(rows);
    if (error) throw error;
    // 지운 줄도 내려와야 한다 (다른 기기에 지운 사실 전파)
    const { error: deleteError } = await guest.client
      .from('records')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', rows[0].id);
    if (deleteError) throw deleteError;
  });

  afterAll(() => deleteGuests(guest));

  async function page(after: SyncCursor | null) {
    let query = guest.client
      .from('records')
      .select('id, title, updated_at, deleted_at');
    if (after) query = query.or(toAfterCursorFilter(after));
    const { data, error } = await query
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(PAGE);
    expect(error).toBeNull();
    return data ?? [];
  }

  it('같은 시각의 줄이 페이지 경계에 걸려도 빠지거나 겹치지 않고, 지운 줄도 받는다', async () => {
    const seen: string[] = [];
    let after: SyncCursor | null = null;
    for (;;) {
      const rows = await page(after);
      seen.push(...rows.map((row) => row.title));
      if (rows.length < PAGE) break;
      const last = rows[rows.length - 1];
      after = { updatedAt: last.updated_at, id: last.id };
    }
    expect([...seen].sort()).toEqual(['가', '나', '다', '라', '마']);
    expect(new Set(seen).size).toBe(5);
  });

  it('마지막 커서 뒤로는 받을 줄이 없다', async () => {
    const all = await guest.client
      .from('records')
      .select('id, updated_at')
      .order('updated_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1);
    const newest = all.data![0];
    expect(await page({ updatedAt: newest.updated_at, id: newest.id })).toEqual(
      [],
    );
  });
});
