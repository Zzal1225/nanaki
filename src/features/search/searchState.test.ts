import { describe, expect, it } from 'vitest';
import {
  EMPTY_SEARCH_STATE,
  hasSearchCondition,
  parseSearchState,
  toSearchHref,
  toSearchParams,
} from './searchState';

const parse = (query: string) => parseSearchState(new URLSearchParams(query));

describe('주소 → 검색 상태', () => {
  it('검색어·타입·정렬을 읽는다', () => {
    expect(parse('q=카페&type=expense&sort=oldest')).toEqual({
      keyword: '카페',
      type: 'expense',
      sort: 'oldest',
    });
  });
  it('없거나 틀린 값은 기본값 (모르는 타입, 모르는 정렬, 상속 키)', () => {
    expect(parse('')).toEqual(EMPTY_SEARCH_STATE);
    expect(parse('type=toString&sort=random')).toEqual(EMPTY_SEARCH_STATE);
  });
  it('검색어는 앞뒤 공백을 빼고 50자에서 자른다', () => {
    expect(parse('q=%20%20라떼%20').keyword).toBe('라떼');
    expect(parse(`q=${'가'.repeat(80)}`).keyword).toHaveLength(50);
  });
});

describe('검색 상태 → 주소', () => {
  it('기본값은 쓰지 않는다', () => {
    expect(toSearchParams(EMPTY_SEARCH_STATE)).toBe('');
    expect(toSearchHref(EMPTY_SEARCH_STATE)).toBe('/records/search');
  });
  it('읽은 상태를 다시 쓰면 같은 상태 (왕복)', () => {
    const state = parse('q=1%2B1%20%26&type=review&sort=oldest');
    expect(parse(toSearchParams(state))).toEqual(state);
    expect(state.keyword).toBe('1+1 &');
  });
});

describe('조회할 조건', () => {
  it('검색어나 타입이 있어야 조회한다 (정렬만으로는 아니다)', () => {
    expect(hasSearchCondition(EMPTY_SEARCH_STATE)).toBe(false);
    expect(hasSearchCondition({ ...EMPTY_SEARCH_STATE, sort: 'oldest' })).toBe(
      false,
    );
    expect(hasSearchCondition({ ...EMPTY_SEARCH_STATE, keyword: '카페' })).toBe(
      true,
    );
    expect(hasSearchCondition({ ...EMPTY_SEARCH_STATE, type: 'body' })).toBe(
      true,
    );
  });
});
