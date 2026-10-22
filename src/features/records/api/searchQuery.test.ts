import { describe, expect, it } from 'vitest';
import {
  escapeRegex,
  SEARCHABLE_FIELD_NAMES,
  toKeywordFilter,
} from './searchQuery';

describe('검색 대상 칸', () => {
  it('필드 정의의 선택 칸을 모은다 (숫자·별점 칸은 빠진다)', () => {
    expect([...SEARCHABLE_FIELD_NAMES].sort()).toEqual(
      ['activity', 'category', 'paymentMethod', 'targetKind'].sort(),
    );
  });
});

describe('검색어 → 정규식 글자 그대로', () => {
  it('한글·영문은 그대로', () => {
    expect(escapeRegex('카페 latte')).toBe('카페 latte');
  });
  it('정규식 특수 글자는 앞에 \\ (특히 *는 PostgREST가 와일드카드로 바꾸는 글자)', () => {
    expect(escapeRegex('*')).toBe('\\*');
    expect(escapeRegex('1+1 (2)')).toBe('1\\+1 \\(2\\)');
    expect(escapeRegex('a.b?')).toBe('a\\.b\\?');
  });
});

describe('or 필터 글자', () => {
  it('제목·메모·선택 칸마다 imatch, 쉼표로 잇는다', () => {
    const filter = toKeywordFilter('카페');
    expect(filter.split(',')).toContain('title.imatch."카페"');
    expect(filter.split(',')).toContain('memo.imatch."카페"');
    expect(filter.split(',')).toContain('fields->>category.imatch."카페"');
  });
  it('쉼표·괄호·따옴표가 있어도 값은 따옴표 안에 갇힌다', () => {
    expect(toKeywordFilter('a,"b"')).toContain('title.imatch."a,\\"b\\""');
    // 정규식 이스케이프 \( 의 \가 PostgREST 따옴표 안에서 한 번 더 막혀 \\( 가 된다
    expect(toKeywordFilter('(')).toContain('title.imatch."\\\\("');
  });
});
