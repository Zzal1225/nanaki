import { describe, expect, it } from 'vitest';
import {
  formatPeriodTitle,
  getVisibleRange,
  getVisibleWeeks,
  isOutsidePeriod,
} from './calendarPeriod';
import type { CalendarState } from './calendarState';

const MONTH: CalendarState = { view: 'month', date: '2026-10-21' };
const WEEK: CalendarState = { view: 'week', date: '2026-10-21' };
// 2026-10-01(목)이 있는 주는 9월 27일~10월 3일
const WEEK_ACROSS_MONTHS: CalendarState = { view: 'week', date: '2026-10-01' };

describe('getVisibleWeeks', () => {
  it('월 보기는 그 달의 주들, 주 보기는 한 주', () => {
    expect(getVisibleWeeks(MONTH)).toHaveLength(5);
    expect(getVisibleWeeks(WEEK)).toEqual([
      [
        '2026-10-18',
        '2026-10-19',
        '2026-10-20',
        '2026-10-21',
        '2026-10-22',
        '2026-10-23',
        '2026-10-24',
      ],
    ]);
  });
});

describe('getVisibleRange', () => {
  it('월 보기는 그 달 1일~말일', () => {
    expect(getVisibleRange(MONTH)).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    });
  });
  it('주 보기는 달이 걸쳐도 그 주 7일', () => {
    expect(getVisibleRange(WEEK_ACROSS_MONTHS)).toEqual({
      from: '2026-09-27',
      to: '2026-10-03',
    });
  });
});

describe('isOutsidePeriod', () => {
  it('월 보기: 다른 달 날짜만 바깥', () => {
    expect(isOutsidePeriod(MONTH, '2026-09-30')).toBe(true);
    expect(isOutsidePeriod(MONTH, '2026-10-01')).toBe(false);
  });
  it('주 보기: 다른 달 날짜도 바깥이 아니다 (그 주 기록을 다 불러온다)', () => {
    expect(isOutsidePeriod(WEEK_ACROSS_MONTHS, '2026-09-27')).toBe(false);
  });
});

describe('formatPeriodTitle', () => {
  it('월 보기: 연도와 달', () => {
    expect(formatPeriodTitle(MONTH)).toBe('2026년 10월');
  });
  it('주 보기: 같은 달이면 시안 모양', () => {
    expect(formatPeriodTitle(WEEK)).toBe('10월 18–24일');
  });
  it('주 보기: 달이 걸치면 양쪽에 달', () => {
    expect(formatPeriodTitle(WEEK_ACROSS_MONTHS)).toBe('9월 27일–10월 3일');
  });
  it('주 보기: 해가 걸치면 양쪽에 연도', () => {
    expect(formatPeriodTitle({ view: 'week', date: '2026-12-31' })).toBe(
      '2026년 12월 27일–2027년 1월 2일',
    );
  });
});
