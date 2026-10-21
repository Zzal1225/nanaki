import { describe, expect, expectTypeOf, it } from 'vitest';
import { RATING_MAX, RATING_MIN } from './fieldKinds';
import { reviewFieldsSchema, type ReviewFields } from './review';

const VALID = { rating: 4, targetKind: '장소' };

function isValid(value: unknown) {
  return reviewFieldsSchema.safeParse(value).success;
}

describe('reviewFieldsSchema', () => {
  it('정상 값은 통과', () => {
    expect(isValid(VALID)).toBe(true);
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
  // 장소 칸을 없애기 전에 저장한 기록도 목록에서 사라지지 않아야 한다
  it('예전 기록에 남은 place는 실패시키지 않고 떨어뜨린다', () => {
    const parsed = reviewFieldsSchema.parse({ ...VALID, place: '성수' });
    expect(parsed).toEqual(VALID);
  });
});

describe('ReviewFields 타입', () => {
  it("targetKind는 '장소' | '제품' | '콘텐츠' | '경험'", () => {
    expectTypeOf<ReviewFields['targetKind']>().toEqualTypeOf<
      '장소' | '제품' | '콘텐츠' | '경험'
    >();
  });
  it('필드는 별점과 대상 두 개', () => {
    expectTypeOf<keyof ReviewFields>().toEqualTypeOf<'rating' | 'targetKind'>();
  });
});
