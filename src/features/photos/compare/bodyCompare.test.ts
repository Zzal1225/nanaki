import { describe, expect, it } from 'vitest';
import type { RecordEntryOf } from '@/features/records/schema/recordEntry';
import {
  bodyCompareHref,
  clampPosition,
  daysBetween,
  measureDiffs,
  nearestMeasure,
  parseCompareKind,
  pickPhotoByDate,
  resolveCompareDates,
} from './bodyCompare';

const body = (
  id: string,
  occurredAt: string,
  fields: { weight?: number; waist?: number },
): RecordEntryOf<'body'> => ({
  id,
  type: 'body',
  occurredAt,
  title: '체형',
  memo: null,
  tags: [],
  fields,
});

describe('주소', () => {
  it('자세·두 날짜를 주소에 담는다 (새로고침·공유에 남게)', () => {
    expect(
      bodyCompareHref({ kind: 'side', from: '2026-09-20', to: '2026-10-19' }),
    ).toBe('/body-compare?kind=side&from=2026-09-20&to=2026-10-19');
    expect(bodyCompareHref({})).toBe('/body-compare');
  });
  it('모르는 자세는 정면', () => {
    expect(parseCompareKind('side')).toBe('side');
    expect(parseCompareKind('review')).toBe('front');
    expect(parseCompareKind(null)).toBe('front');
  });
});

describe('resolveCompareDates (사진이 있는 날짜 안에서)', () => {
  const dates = ['2026-10-19', '2026-09-20', '2026-10-05', '2026-10-05'];

  it('기본은 처음 사진 → 최근 사진', () => {
    expect(resolveCompareDates(dates, { from: null, to: null })).toEqual({
      from: '2026-09-20',
      to: '2026-10-19',
    });
  });
  it('주소의 날짜를 쓰되, 사진이 없는 날짜는 기본으로', () => {
    expect(
      resolveCompareDates(dates, { from: '2026-10-05', to: '2026-10-01' }),
    ).toEqual({ from: '2026-10-05', to: '2026-10-19' });
  });
  it('거꾸로 고르면 앞 날짜가 왼쪽이 되게 바꾼다', () => {
    expect(
      resolveCompareDates(dates, { from: '2026-10-19', to: '2026-09-20' }),
    ).toEqual({ from: '2026-09-20', to: '2026-10-19' });
  });
  it('같은 날을 둘 다 고르면 뒤 날짜를 다음 사진 날짜로', () => {
    expect(
      resolveCompareDates(dates, { from: '2026-10-05', to: '2026-10-05' }),
    ).toEqual({ from: '2026-10-05', to: '2026-10-19' });
    expect(
      resolveCompareDates(dates, { from: '2026-10-19', to: '2026-10-19' }),
    ).toEqual({ from: '2026-10-05', to: '2026-10-19' });
  });
  it('사진 날짜가 2개 미만이면 비교할 수 없다', () => {
    expect(
      resolveCompareDates(['2026-10-05', '2026-10-05'], {
        from: null,
        to: null,
      }),
    ).toBeNull();
  });
});

describe('nearestMeasure (그 날짜에 가장 가까운 기록)', () => {
  const entries = [
    body('a', '2026-09-18', { weight: 69.6 }),
    body('b', '2026-09-22', { weight: 69.4, waist: 80 }),
    body('c', '2026-10-19', { waist: 78 }),
  ];
  it('앞뒤 상관없이 가까운 것, 같은 거리면 앞 날짜', () => {
    expect(nearestMeasure(entries, '2026-09-20', 'weight')).toEqual({
      value: 69.6,
      date: '2026-09-18',
    });
    expect(nearestMeasure(entries, '2026-09-21', 'weight')).toEqual({
      value: 69.4,
      date: '2026-09-22',
    });
  });
  it('그 항목이 없는 기록은 건너뛴다', () => {
    expect(nearestMeasure(entries, '2026-10-19', 'weight')?.date).toBe(
      '2026-09-22',
    );
    expect(nearestMeasure([], '2026-10-19', 'weight')).toBeNull();
  });
});

describe('measureDiffs (두 날짜의 변화)', () => {
  it('체중·허리둘레 변화, 소수 오차 없이', () => {
    const entries = [
      body('a', '2026-09-20', { weight: 69.6, waist: 80 }),
      body('b', '2026-10-19', { weight: 68.4, waist: 78 }),
    ];
    expect(measureDiffs(entries, '2026-09-20', '2026-10-19')).toEqual([
      {
        measure: 'weight',
        label: '체중',
        before: '69.6kg',
        after: '68.4kg',
        change: '-1.2kg',
        changeValue: -1.2,
      },
      {
        measure: 'waist',
        label: '허리둘레',
        before: '80cm',
        after: '78cm',
        change: '-2cm',
        changeValue: -2,
      },
    ]);
  });
  it('늘면 +, 한 번도 안 잰 항목은 줄이 없다', () => {
    const entries = [
      body('a', '2026-09-20', { weight: 68 }),
      body('b', '2026-10-19', { weight: 68.5 }),
    ];
    const rows = measureDiffs(entries, '2026-09-20', '2026-10-19');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.change).toBe('+0.5kg');
  });
});

describe('날짜·손잡이', () => {
  it('두 날짜 사이 날 수 (달을 넘어도)', () => {
    expect(daysBetween('2026-09-20', '2026-10-19')).toBe(29);
  });
  it('손잡이 위치는 0~100 정수', () => {
    expect(clampPosition(-5)).toBe(0);
    expect(clampPosition(104)).toBe(100);
    expect(clampPosition(49.6)).toBe(50);
  });
});

describe('pickPhotoByDate', () => {
  it('같은 날이면 나중 것 하나', () => {
    const map = pickPhotoByDate([
      { date: '2026-10-05', id: 'a' },
      { date: '2026-10-05', id: 'b' },
      { date: '2026-10-19', id: 'c' },
    ]);
    expect([...map.keys()]).toEqual(['2026-10-05', '2026-10-19']);
    expect(map.get('2026-10-05')?.id).toBe('b');
  });
});
