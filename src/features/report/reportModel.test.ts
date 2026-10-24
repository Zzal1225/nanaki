import { describe, expect, it } from 'vitest';
import type {
  RecordEntry,
  RecordEntryOf,
} from '@/features/records/schema/recordEntry';
import {
  countLabel,
  parseReportQuery,
  presetRange,
  reportHref,
  reportTitle,
  routineRange,
  singleMonthOf,
  topReviews,
  workoutBuckets,
} from './reportModel';

const BASE = { memo: null, tags: [] as string[], title: '기록' };
const workout = (id: string, occurredAt: string, minutes: number) =>
  ({
    ...BASE,
    id,
    type: 'workout',
    occurredAt,
    fields: { activity: '러닝', minutes },
  }) as RecordEntryOf<'workout'>;
const review = (id: string, occurredAt: string, rating: number) =>
  ({
    ...BASE,
    id,
    type: 'review',
    occurredAt,
    title: id,
    fields: { rating, targetKind: '장소' },
  }) as RecordEntryOf<'review'>;

describe('기간 칩 (오늘 2026-10-24)', () => {
  const today = '2026-10-24';
  it('이번 달·지난달은 그 달 전체, 최근 3개월은 8~10월, 올해는 1~12월', () => {
    expect(presetRange('thisMonth', today)).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    });
    expect(presetRange('lastMonth', today)).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    });
    expect(presetRange('last3Months', today)).toEqual({
      from: '2026-08-01',
      to: '2026-10-31',
    });
    expect(presetRange('thisYear', today)).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    });
  });
  it('1월의 지난달은 작년 12월', () => {
    expect(presetRange('lastMonth', '2026-01-10')).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });
});

describe('주소', () => {
  it('만들고 그대로 읽는다', () => {
    const href = reportHref({
      from: '2026-10-01',
      to: '2026-10-31',
      types: ['expense', 'body'],
    });
    expect(href).toBe(
      '/report?from=2026-10-01&to=2026-10-31&types=expense%2Cbody',
    );
    const params = new URLSearchParams(href.split('?')[1]);
    expect(
      parseReportQuery({
        from: params.get('from'),
        to: params.get('to'),
        types: params.get('types'),
      }),
    ).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
      types: ['expense', 'body'],
    });
  });
  it('틀린 날짜·거꾸로·타입 없음은 고르는 화면으로(null), 모르는 타입은 버린다', () => {
    expect(
      parseReportQuery({
        from: '2026-02-30',
        to: '2026-03-01',
        types: 'expense',
      }),
    ).toBeNull();
    expect(
      parseReportQuery({
        from: '2026-10-31',
        to: '2026-10-01',
        types: 'expense',
      }),
    ).toBeNull();
    expect(
      parseReportQuery({
        from: '2026-10-01',
        to: '2026-10-31',
        types: 'photo',
      }),
    ).toBeNull();
    expect(
      parseReportQuery({
        from: '2026-10-01',
        to: '2026-10-31',
        types: 'photo,review',
      })?.types,
    ).toEqual(['review']);
  });
});

describe('제목', () => {
  it('한 달·한 해·그 밖의 기간', () => {
    expect(reportTitle({ from: '2026-10-01', to: '2026-10-31' })).toBe(
      '2026년 10월 보고서',
    );
    expect(reportTitle({ from: '2026-01-01', to: '2026-12-31' })).toBe(
      '2026년 보고서',
    );
    expect(reportTitle({ from: '2026-09-20', to: '2026-10-19' })).toBe(
      '09.20 – 10.19 보고서',
    );
  });
  it('한 달짜리인지 (예산 줄)', () => {
    expect(singleMonthOf({ from: '2026-10-01', to: '2026-10-31' })).toBe(
      '2026-10',
    );
    expect(singleMonthOf({ from: '2026-08-01', to: '2026-10-31' })).toBeNull();
  });
});

describe('포함할 기록의 개수', () => {
  it('타입마다 건·회, 루틴은 체크한 날 수', () => {
    const entries = [
      workout('w1', '2026-10-01', 30),
      workout('w2', '2026-10-02', 40),
      {
        ...BASE,
        id: 'r1',
        type: 'routine',
        occurredAt: '2026-10-01',
        fields: { routineId: 'a', count: 1, target: 1, unit: '' },
      },
      {
        ...BASE,
        id: 'r2',
        type: 'routine',
        occurredAt: '2026-10-01',
        fields: { routineId: 'b', count: 1, target: 1, unit: '' },
      },
    ] as RecordEntry[];
    expect(countLabel('workout', entries)).toBe('2회');
    expect(countLabel('routine', entries)).toBe('1일');
    expect(countLabel('expense', entries)).toBe('0건');
  });
});

describe('운동 묶음', () => {
  it('한 달이면 7일씩, 마지막 묶음은 말일까지', () => {
    const buckets = workoutBuckets(
      [
        workout('a', '2026-10-01', 30),
        workout('b', '2026-10-08', 20),
        workout('c', '2026-10-31', 10),
      ],
      { from: '2026-10-01', to: '2026-10-31' },
    );
    expect(buckets.map((bucket) => bucket.label)).toEqual([
      '1~7일',
      '8~14일',
      '15~21일',
      '22~28일',
      '29~31일',
    ]);
    expect(buckets.map((bucket) => bucket.minutes)).toEqual([30, 20, 0, 0, 10]);
  });
  it('여러 달이면 달마다', () => {
    expect(
      workoutBuckets(
        [workout('a', '2026-08-03', 30), workout('b', '2026-10-08', 20)],
        {
          from: '2026-08-01',
          to: '2026-10-31',
        },
      ),
    ).toEqual([
      { label: '8월', minutes: 30 },
      { label: '9월', minutes: 0 },
      { label: '10월', minutes: 20 },
    ]);
  });
});

describe('별점 높은 후기·루틴 기간', () => {
  it('별점 높은 순, 같으면 최근 것', () => {
    const list = topReviews(
      [
        review('A', '2026-10-01', 4),
        review('B', '2026-10-05', 5),
        review('C', '2026-10-09', 4),
      ],
      2,
    );
    expect(list.map((item) => item.title)).toEqual(['B', 'C']);
  });
  it('루틴 달성률은 오늘까지만, 통째로 미래면 셀 수 없다', () => {
    expect(
      routineRange({ from: '2026-10-01', to: '2026-10-31' }, '2026-10-24'),
    ).toEqual({
      from: '2026-10-01',
      to: '2026-10-24',
    });
    expect(
      routineRange({ from: '2026-11-01', to: '2026-11-30' }, '2026-10-24'),
    ).toBeNull();
  });
});
