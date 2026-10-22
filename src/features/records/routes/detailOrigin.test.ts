import { describe, expect, it } from 'vitest';
import {
  detailBackTarget,
  homeOriginQuery,
  originQueryOf,
  parseDetailOrigin,
  typeOriginQuery,
} from './detailOrigin';
import { recordViewHref } from './recordRoutes';

function originOf(href: string) {
  return parseDetailOrigin(new URL(href, 'https://x').searchParams);
}

describe('상세에 들어온 곳', () => {
  it('타입 화면(그 달)에서 열면 그 타입 화면의 같은 달로 돌아간다', () => {
    const origin = originOf(recordViewHref('a', typeOriginQuery('2026-09')));
    expect(detailBackTarget(origin, 'review')).toEqual({
      href: '/records/type/review?month=2026-09',
      label: '후기 화면으로 돌아가기',
    });
  });

  it('홈 하루 요약에서 열면 홈의 그 날짜로', () => {
    const origin = originOf(recordViewHref('a', homeOriginQuery('2026-10-16')));
    expect(detailBackTarget(origin, 'expense').href).toBe('/?date=2026-10-16');
  });

  it('검색 결과에서 열면 그 결과로, 아무것도 없으면 기록 탭으로', () => {
    expect(
      detailBackTarget(originOf('/records/view?id=a&q=카페'), 'expense').href,
    ).toBe('/records/search?q=%EC%B9%B4%ED%8E%98');
    expect(detailBackTarget(originOf('/records/view?id=a'), 'expense')).toEqual(
      { href: '/records', label: '기록 탭으로 돌아가기' },
    );
  });

  it('틀린 달·날짜는 버린다', () => {
    expect(
      detailBackTarget(
        originOf('/records/view?id=a&back=type&month=2026-13'),
        'body',
      ).href,
    ).toBe('/records/type/body');
    expect(
      detailBackTarget(
        originOf('/records/view?id=a&back=home&date=어제'),
        'body',
      ).href,
    ).toBe('/');
  });

  it('수정 화면으로 넘길 때 id만 빼고 조건을 그대로', () => {
    const params = new URL(
      recordViewHref('a', typeOriginQuery('2026-09')),
      'https://x',
    ).searchParams;
    expect(originQueryOf(params)).toBe('back=type&month=2026-09');
  });
});
