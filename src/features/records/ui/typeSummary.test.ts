import { describe, expect, it } from 'vitest';
import type { RecordEntryOf } from '../schema/recordEntry';
import {
  compareExpensesWithPreviousMonth,
  getSamePeriod,
  summarizeBody,
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
  it('개수, 대상 종류 4개 모두 (0개 포함)', () => {
    const summary = summarizeReviews([
      review('1', 5, '장소'),
      review('2', 4, '장소'),
      review('3', 4, '제품'),
    ]);
    expect(summary.count).toBe(3);
    expect(summary.kinds).toEqual([
      { name: '장소', count: 2 },
      { name: '제품', count: 1 },
      { name: '콘텐츠', count: 0 },
      { name: '경험', count: 0 },
    ]);
  });
  it('평균 별점은 계산하지 않는다 (사용자 결정)', () => {
    expect(summarizeReviews([review('1', 5, '장소')])).not.toHaveProperty(
      'average',
    );
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

function body(
  id: string,
  occurredAt: string,
  fields: RecordEntryOf<'body'>['fields'],
): RecordEntryOf<'body'> {
  return { ...BASE, id, occurredAt, type: 'body', fields };
}

describe('summarizeBody', () => {
  it('마지막 체중, 첫 기록 → 마지막 기록 변화(소수 한 자리), 날짜 순 점', () => {
    const summary = summarizeBody(
      [
        body('2', '2026-10-19', { weight: 68.4, waist: 78 }),
        body('1', '2026-10-01', { weight: 69.6 }),
      ],
      '2026-10',
    );
    expect(summary.latestWeight).toBe(68.4);
    // 68.4 - 69.6은 부동소수점으로 -1.1999…가 된다
    expect(summary.change).toBe(-1.2);
    expect(summary.points).toEqual([
      { day: 1, weight: 69.6 },
      { day: 19, weight: 68.4 },
    ]);
    expect(summary.daysInMonth).toBe(31);
    expect(summary.latestOthers).toEqual([
      { label: '허리', value: 78, unit: 'cm' },
    ]);
  });
  it('같은 날 여러 번 쟀으면 그날의 마지막 기록만 점 하나', () => {
    const summary = summarizeBody(
      [
        body('1', '2026-10-05', { weight: 70 }),
        body('2', '2026-10-05', { weight: 69.5 }),
      ],
      '2026-10',
    );
    expect(summary.points).toEqual([{ day: 5, weight: 69.5 }]);
    // 잰 날이 하루뿐이면 비교할 게 없다
    expect(summary.change).toBeNull();
  });
  it('기록이 없는 달', () => {
    const summary = summarizeBody([], '2026-02');
    expect(summary.latestWeight).toBeNull();
    expect(summary.change).toBeNull();
    expect(summary.points).toEqual([]);
    expect(summary.daysInMonth).toBe(28);
  });
});

describe('getSamePeriod (지난달 같은 기간)', () => {
  it('이번 달: 1일~오늘 vs 지난달 1일~같은 날', () => {
    expect(getSamePeriod('2026-10', '2026-10-22')).toEqual({
      current: { from: '2026-10-01', to: '2026-10-22' },
      previous: { from: '2026-09-01', to: '2026-09-22' },
    });
  });
  it('지난달에 그 날이 없으면 말일까지 (3월 31일 → 2월 28일)', () => {
    expect(getSamePeriod('2027-03', '2027-03-31')?.previous).toEqual({
      from: '2027-02-01',
      to: '2027-02-28',
    });
  });
  it('1월이면 지난해 12월과', () => {
    expect(getSamePeriod('2027-01', '2027-01-05')?.previous).toEqual({
      from: '2026-12-01',
      to: '2026-12-05',
    });
  });
  it('지난 달을 볼 때는 두 달 전체', () => {
    expect(getSamePeriod('2026-09', '2026-10-22')).toEqual({
      current: { from: '2026-09-01', to: '2026-09-30' },
      previous: { from: '2026-08-01', to: '2026-08-31' },
    });
  });
  it('아직 오지 않은 달은 비교하지 않는다', () => {
    expect(getSamePeriod('2026-11', '2026-10-22')).toBeNull();
  });
});

describe('compareExpensesWithPreviousMonth', () => {
  const period = getSamePeriod('2026-10', '2026-10-22')!;
  function spent(id: string, occurredAt: string, amount: number) {
    return { ...expense(id, amount, '식비'), occurredAt };
  }

  it('같은 기간끼리만 더해서 뺀다 (기간 밖 기록은 빠진다)', () => {
    const difference = compareExpensesWithPreviousMonth(
      [spent('1', '2026-10-05', 10000), spent('2', '2026-10-25', 99000)],
      [spent('3', '2026-09-10', 22000), spent('4', '2026-09-28', 50000)],
      period,
    );
    // 10월 1~22일 10,000원 - 9월 1~22일 22,000원
    expect(difference).toBe(-12000);
  });
  it('지난달 같은 기간에 기록이 없으면 null (비교하지 않음)', () => {
    expect(
      compareExpensesWithPreviousMonth(
        [spent('1', '2026-10-05', 10000)],
        [spent('3', '2026-09-28', 22000)],
        period,
      ),
    ).toBeNull();
  });
});
