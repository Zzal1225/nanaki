import { describe, expect, it } from 'vitest';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import { groupByDate, groupByType } from './dayRecords';

const BASE = { memo: null, tags: [] };

const CAFE: RecordEntry = {
  ...BASE,
  id: '1',
  type: 'review',
  occurredAt: '2026-10-16',
  title: '동네 로스터리',
  fields: { rating: 4, targetKind: '장소' },
};
const LUNCH: RecordEntry = {
  ...BASE,
  id: '2',
  type: 'expense',
  occurredAt: '2026-10-16',
  title: '점심',
  fields: { amount: 12500, category: '식비' },
};
const TAXI: RecordEntry = {
  ...BASE,
  id: '3',
  type: 'expense',
  occurredAt: '2026-10-19',
  title: '택시',
  fields: { amount: 7000, category: '교통' },
};

describe('groupByDate', () => {
  it('날짜별로 나누고, 받은 순서를 지킨다', () => {
    const byDate = groupByDate([CAFE, LUNCH, TAXI]);
    expect(byDate.get('2026-10-16')).toEqual([CAFE, LUNCH]);
    expect(byDate.get('2026-10-19')).toEqual([TAXI]);
    expect(byDate.get('2026-10-17')).toBeUndefined();
  });
});

describe('groupByType', () => {
  it('정해진 타입 순서(가계부 → 후기)로, 없는 타입은 뺀다', () => {
    expect(groupByType([CAFE, LUNCH])).toEqual([
      { type: 'expense', entries: [LUNCH] },
      { type: 'review', entries: [CAFE] },
    ]);
    expect(groupByType([TAXI])).toEqual([{ type: 'expense', entries: [TAXI] }]);
  });
  it('기록이 없으면 빈 배열', () => {
    expect(groupByType([])).toEqual([]);
  });
});
