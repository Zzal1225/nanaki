import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  deleteGuests,
  hasTestSupabase,
  newRecordRow,
  signInAsNewGuest,
  type TestGuest,
} from './testSupabase';

// insert 한 번에 여러 줄을 넣어도(체험하기 예시 기록) 만든 시각이 넣은 순서대로 달라야 한다.
// created_at 기본값이 now()였을 때는 모두 같은 시각이라 목록 순서가 불러올 때마다 바뀌었다 (화면 비교 테스트로 발견)
describe.skipIf(!hasTestSupabase)('records 만든 시각', () => {
  let guest: TestGuest;

  beforeAll(async () => {
    guest = await signInAsNewGuest();
  });

  afterAll(() => deleteGuests(guest));

  it('한 번에 넣은 줄도 created_at이 넣은 순서대로 서로 다르다', async () => {
    const rows = ['첫째', '둘째', '셋째'].map(newRecordRow);
    const { error } = await guest.client.from('records').insert(rows);
    expect(error).toBeNull();

    const { data } = await guest.client
      .from('records')
      .select('title, created_at')
      .order('created_at', { ascending: true });

    expect(data?.map((row) => row.title)).toEqual(['첫째', '둘째', '셋째']);
    const times = new Set(data?.map((row) => row.created_at));
    expect(times.size).toBe(3);
  });
});
