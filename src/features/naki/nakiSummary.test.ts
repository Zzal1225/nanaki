import { describe, expect, it } from 'vitest';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import { formatNakiSummary, summarizeNakiResults } from './nakiSummary';

const BASE = { memo: null, tags: [], occurredAt: '2026-09-12' };
const LUNCH: RecordEntry = {
  ...BASE,
  id: '1',
  type: 'expense',
  title: '점심',
  fields: { amount: 15000, category: '외식' },
};
const DINNER: RecordEntry = {
  ...LUNCH,
  id: '2',
  fields: { amount: 31400, category: '외식' },
};
const RUN: RecordEntry = {
  ...BASE,
  id: '3',
  type: 'workout',
  title: '달리기',
  fields: { activity: '달리기', minutes: 30 },
};

describe('나키 답 한 줄', () => {
  it('가계부 질문은 금액 합계와 건수', () => {
    const summary = summarizeNakiResults([LUNCH, DINNER], 'expense');
    expect(summary).toEqual({ count: 2, total: 46400 });
    expect(formatNakiSummary(summary)).toBe('합계 -46,400원 · 2건');
  });

  it('그 밖에는 건수만, 없으면 없다고', () => {
    expect(formatNakiSummary(summarizeNakiResults([RUN], 'workout'))).toBe(
      '모두 1건이에요',
    );
    expect(formatNakiSummary(summarizeNakiResults([], 'expense'))).toBe(
      '이 조건에 맞는 기록이 없어요',
    );
  });
});
