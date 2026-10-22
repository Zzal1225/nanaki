import { describe, expect, it } from 'vitest';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import { countByType, filterByType, splitByKeyword } from './searchResults';

const BASE = { occurredAt: '2026-10-19', memo: null, tags: [] };
const COFFEE: RecordEntry = {
  ...BASE,
  id: '1',
  type: 'expense',
  title: '커피',
  fields: { amount: 4500, category: '카페' },
};
const LATTE: RecordEntry = { ...COFFEE, id: '2', title: '라떼' };
const CAFE: RecordEntry = {
  ...BASE,
  id: '3',
  type: 'review',
  title: '동네 카페',
  fields: { rating: 4, targetKind: '장소' },
};

describe('타입 칩 건수', () => {
  it('타입마다 세고, 결과가 없는 타입은 0', () => {
    const counts = countByType(
      [COFFEE, LATTE, CAFE],
      ['expense', 'review', 'workout'],
    );
    expect(counts).toEqual({ all: 3, expense: 2, review: 1, workout: 0 });
  });
  it('숨긴 타입(목록에 없는 타입)은 전체 건수에도 넣지 않는다', () => {
    expect(countByType([COFFEE, CAFE], ['expense']).all).toBe(1);
  });
});

describe('타입 거르기', () => {
  it('고른 타입만, 전체면 켜진 타입 모두', () => {
    const entries = [COFFEE, CAFE];
    expect(filterByType(entries, 'review', ['expense', 'review'])).toEqual([
      CAFE,
    ]);
    expect(filterByType(entries, null, ['expense'])).toEqual([COFFEE]);
  });
});

describe('검색어 강조', () => {
  it('맞는 부분을 모두 나눈다 (대소문자 무시, 원래 글자는 그대로)', () => {
    expect(splitByKeyword('Cafe 그리고 cafe', 'CAFE')).toEqual([
      { text: 'Cafe', isMatch: true },
      { text: ' 그리고 ', isMatch: false },
      { text: 'cafe', isMatch: true },
    ]);
  });
  it('검색어가 없거나 안 맞으면 통째로 한 조각', () => {
    expect(splitByKeyword('[식비] 점심', '')).toEqual([
      { text: '[식비] 점심', isMatch: false },
    ]);
    expect(splitByKeyword('점심', '저녁')).toEqual([
      { text: '점심', isMatch: false },
    ]);
  });
  it('특수 글자도 글자 그대로 찾는다', () => {
    expect(splitByKeyword('1+1 행사', '1+1')[0]).toEqual({
      text: '1+1',
      isMatch: true,
    });
  });
});
