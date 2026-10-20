import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  MAX_PLACE_LENGTH,
  RATING_MAX,
  RATING_MIN,
  reviewFieldsSchema,
  type ReviewFields,
} from './review';

const VALID = { rating: 4, targetKind: '장소', place: '블루보틀 성수' };

function isValid(value: unknown) {
  return reviewFieldsSchema.safeParse(value).success;
}

describe('reviewFieldsSchema', () => {
  it('정상 값은 통과', () => {
    expect(isValid(VALID)).toBe(true);
  });
  it('장소를 빼도 통과', () => {
    expect(isValid({ rating: 4, targetKind: '제품' })).toBe(true);
  });
  it('별점 최솟값·최댓값은 통과', () => {
    expect(isValid({ ...VALID, rating: RATING_MIN })).toBe(true);
    expect(isValid({ ...VALID, rating: RATING_MAX })).toBe(true);
  });
  it('최솟값보다 작은 별점은 실패', () => {
    expect(isValid({ ...VALID, rating: RATING_MIN - 1 })).toBe(false);
  });
  it('최댓값보다 큰 별점은 실패', () => {
    expect(isValid({ ...VALID, rating: RATING_MAX + 1 })).toBe(false);
  });
  it('별점 3.5는 실패', () => {
    expect(isValid({ ...VALID, rating: 3.5 })).toBe(false);
  });
  it('목록 밖 대상 종류는 실패', () => {
    expect(isValid({ ...VALID, targetKind: '음식' })).toBe(false);
  });
  it('공백만 있는 장소는 실패', () => {
    expect(isValid({ ...VALID, place: '   ' })).toBe(false);
  });
  it('길이 상한을 넘는 장소는 실패', () => {
    const tooLong = '가'.repeat(MAX_PLACE_LENGTH + 1);
    expect(isValid({ ...VALID, place: tooLong })).toBe(false);
  });
});

describe('ReviewFields 타입', () => {
  it("targetKind는 '장소' | '제품' | '콘텐츠'", () => {
    expectTypeOf<ReviewFields['targetKind']>().toEqualTypeOf<
      '장소' | '제품' | '콘텐츠'
    >();
  });
  it('place는 string | undefined', () => {
    expectTypeOf<ReviewFields['place']>().toEqualTypeOf<string | undefined>();
  });
});
