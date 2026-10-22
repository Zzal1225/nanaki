import { describe, expect, it } from 'vitest';
import type { RecordEntry } from '../schema/recordEntry';
import { matchesKeyword, SEARCHABLE_FIELD_NAMES } from './searchQuery';

const COFFEE: RecordEntry = {
  id: '1',
  type: 'expense',
  occurredAt: '2026-10-19',
  title: '아메리카노',
  memo: '회사 앞 Cafe',
  tags: [],
  fields: { amount: 4500, category: '카페', paymentMethod: '카드' },
};

describe('검색 대상 칸', () => {
  it('필드 정의의 선택 칸을 모은다 (숫자·별점 칸은 빠진다)', () => {
    expect([...SEARCHABLE_FIELD_NAMES].sort()).toEqual(
      ['activity', 'category', 'paymentMethod', 'targetKind'].sort(),
    );
  });
});

describe('검색어 맞추기 (기기 사본에서)', () => {
  it('제목·메모·선택 칸에서 찾고, 영문은 대소문자를 가리지 않는다', () => {
    expect(matchesKeyword(COFFEE, '아메리')).toBe(true);
    expect(matchesKeyword(COFFEE, 'cafe')).toBe(true);
    expect(matchesKeyword(COFFEE, '카페')).toBe(true);
    expect(matchesKeyword(COFFEE, '카드')).toBe(true);
  });
  it('태그에서도 찾는다 (태그마다 따로: 두 태그를 이어 붙인 글자로는 맞지 않는다)', () => {
    const tagged = { ...COFFEE, tags: ['출근길', '단골'] };
    expect(matchesKeyword(tagged, '단골')).toBe(true);
    expect(matchesKeyword(tagged, '길단')).toBe(false);
  });
  it('공백을 빼고 비교한다 (검색어·기록 양쪽)', () => {
    const snack = { ...COFFEE, title: '편의점 간식' };
    expect(matchesKeyword(snack, '편의점간식')).toBe(true);
    expect(
      matchesKeyword({ ...COFFEE, title: '편의점간식' }, '편의점 간식'),
    ).toBe(true);
    // 공백만 친 검색어는 빈 검색어와 같다
    expect(matchesKeyword(COFFEE, '  ')).toBe(true);
  });
  it('숫자 칸(금액)은 글자로 찾지 않는다', () => {
    expect(matchesKeyword(COFFEE, '4500')).toBe(false);
  });
  it('특수 글자도 글자 그대로 (* 는 아무 글자가 아니다)', () => {
    expect(matchesKeyword(COFFEE, '*')).toBe(false);
    expect(matchesKeyword({ ...COFFEE, title: '별*표' }, '*')).toBe(true);
  });
  it('검색어가 비면 모두 맞는다', () => {
    expect(matchesKeyword(COFFEE, '')).toBe(true);
  });
});
