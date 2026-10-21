import { describe, expect, it } from 'vitest';
import type { RecordEntryOf } from '../schema/recordEntry';
import { summarizeExpenses, summarizeReviews } from './typeSummary';

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
