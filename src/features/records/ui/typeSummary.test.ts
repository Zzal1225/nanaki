import { describe, expect, it } from 'vitest';
import type { RecordEntryOf } from '../schema/recordEntry';
import {
  summarizeExpenses,
  summarizeReviews,
  summarizeWorkouts,
} from './typeSummary';

const BASE = { occurredAt: '2026-10-19', memo: null, tags: [], title: 't' };

function expense(
  id: string,
  amount: number,
  category: string,
): RecordEntryOf<'expense'> {
  return { ...BASE, id, type: 'expense', fields: { amount, category } };
}
function review(
  id: string,
  rating: number,
  targetKind: '장소' | '제품' | '콘텐츠' | '경험',
): RecordEntryOf<'review'> {
  return { ...BASE, id, type: 'review', fields: { rating, targetKind } };
}

describe('summarizeExpenses', () => {
  it('같은 분류끼리 더하고 금액이 큰 순서, 비율은 반올림 %', () => {
    const summary = summarizeExpenses([
      expense('1', 10000, '식비'),
      expense('2', 3000, '카페'),
      expense('3', 7000, '식비'),
    ]);
    expect(summary.total).toBe(20000);
    expect(summary.categories).toEqual([
      { name: '식비', amount: 17000, percent: 85 },
      { name: '카페', amount: 3000, percent: 15 },
    ]);
  });
  it('직접 입력한 분류도 한 줄', () => {
    const summary = summarizeExpenses([expense('1', 5000, '반려동물')]);
    expect(summary.categories[0]).toEqual({
      name: '반려동물',
      amount: 5000,
      percent: 100,
    });
  });
  it('기록이 없으면 합계 0, 분류 없음 (0으로 나누지 않는다)', () => {
    expect(summarizeExpenses([])).toEqual({ total: 0, categories: [] });
  });
});

describe('summarizeReviews', () => {
  it('개수, 평균(소수 한 자리), 대상 종류 4개 모두 (0개 포함)', () => {
    const summary = summarizeReviews([
      review('1', 5, '장소'),
      review('2', 4, '장소'),
      review('3', 4, '제품'),
    ]);
    expect(summary.count).toBe(3);
    expect(summary.average).toBe(4.3);
    expect(summary.kinds).toEqual([
      { name: '장소', count: 2 },
      { name: '제품', count: 1 },
      { name: '콘텐츠', count: 0 },
      { name: '경험', count: 0 },
    ]);
  });
  it('후기가 없으면 평균은 null (0점처럼 보이지 않게)', () => {
    expect(summarizeReviews([]).average).toBeNull();
  });
});

function workout(
  id: string,
  occurredAt: string,
  minutes: number,
): RecordEntryOf<'workout'> {
  return {
    ...BASE,
    id,
    occurredAt,
    type: 'workout',
    fields: { activity: '러닝', minutes },
  };
}

describe('summarizeWorkouts', () => {
  it('횟수·총 시간, 주별 시간은 캘린더 줄(일요일 시작)과 같은 주로 묶는다', () => {
    // 2026년 10월 1일은 목요일 → 1주 = 1~3일, 2주 = 4~10일 … 5주 = 25~31일
    const summary = summarizeWorkouts(
      [
        workout('1', '2026-10-03', 30),
        workout('2', '2026-10-04', 45),
        workout('3', '2026-10-04', 15),
        workout('4', '2026-10-31', 60),
      ],
      '2026-10',
    );
    expect(summary.count).toBe(4);
    expect(summary.totalMinutes).toBe(150);
    expect(summary.weeks).toEqual([
      { firstDay: 1, lastDay: 3, minutes: 30 },
      { firstDay: 4, lastDay: 10, minutes: 60 },
      { firstDay: 11, lastDay: 17, minutes: 0 },
      { firstDay: 18, lastDay: 24, minutes: 0 },
      { firstDay: 25, lastDay: 31, minutes: 60 },
    ]);
  });
  it('운동이 없는 달도 주는 모두 0분으로 나온다 (빈 막대)', () => {
    // 2026년 2월: 1일이 일요일, 28일이 토요일 → 딱 4주
    const summary = summarizeWorkouts([], '2026-02');
    expect(summary.count).toBe(0);
    expect(summary.weeks).toHaveLength(4);
    expect(summary.weeks.every((week) => week.minutes === 0)).toBe(true);
  });
});
