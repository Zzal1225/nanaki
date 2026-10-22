import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { toKeywordFilter } from '@/features/records/api/searchQuery';
import {
  deleteGuests,
  hasTestSupabase,
  newRecordRow,
  signInAsNewGuest,
  type TestGuest,
} from './testSupabase';

// 검색어 필터 글자(toKeywordFilter)를 진짜 PostgREST에 보내 본다.
// 따옴표·이스케이프 규칙은 단위 테스트로는 "이런 글자를 만든다"까지만 알 수 있고, 서버가 그렇게 읽는지는 여기서만 확인된다
describe.skipIf(!hasTestSupabase)('검색어 필터', () => {
  let guest: TestGuest;

  beforeAll(async () => {
    guest = await signInAsNewGuest();
    const rows = [
      {
        ...newRecordRow('아메리카노'),
        fields: { amount: 4500, category: '카페' },
      },
      { ...newRecordRow('점심'), memo: '회사 앞 Cafe' },
      newRecordRow('별*표'),
      newRecordRow('1+1 (행사), "특가"'),
      newRecordRow('버스'),
    ];
    const { error } = await guest.client.from('records').insert(rows);
    if (error) throw error;
  });

  afterAll(() => deleteGuests(guest));

  async function titlesFor(keyword: string): Promise<string[]> {
    const { data, error } = await guest.client
      .from('records')
      .select('title')
      .or(toKeywordFilter(keyword))
      .order('title');
    expect(error).toBeNull();
    return (data ?? []).map((row) => row.title);
  }

  it('선택 칸(분류)과 메모도 찾고, 영문은 대소문자를 가리지 않는다', async () => {
    expect(await titlesFor('카페')).toEqual(['아메리카노']);
    expect(await titlesFor('cafe')).toEqual(['점심']);
  });

  // *는 PostgREST가 like에서 와일드카드로 바꾸는 글자. 글자 그대로 찾아야 한다
  it('* 는 별표 글자 하나만 찾는다 (모든 기록이 나오지 않는다)', async () => {
    expect(await titlesFor('*')).toEqual(['별*표']);
  });

  it('쉼표·괄호·따옴표·+ 가 있어도 필터 문법이 깨지지 않는다', async () => {
    expect(await titlesFor('1+1 (행사), "특가"')).toEqual([
      '1+1 (행사), "특가"',
    ]);
    expect(await titlesFor('(')).toEqual(['1+1 (행사), "특가"']);
  });

  it('맞는 기록이 없으면 빈 목록', async () => {
    expect(await titlesFor('없는말')).toEqual([]);
  });
});
