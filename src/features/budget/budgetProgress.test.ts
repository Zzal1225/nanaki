import { describe, expect, it } from 'vitest';
import type { RecordEntryOf } from '@/features/records/schema/recordEntry';
import { getBudgetProgress } from './budgetProgress';

let count = 0;
function expense(amount: number, category: string): RecordEntryOf<'expense'> {
  count += 1;
  return {
    id: `id-${count}`,
    type: 'expense',
    occurredAt: '2026-10-05',
    title: `지출 ${count}`,
    memo: null,
    tags: [],
    fields: { amount, category },
  };
}

const OCTOBER = {
  month: '2026-10',
  total: 600000,
  categories: { 카페: 50000, 식비: 300000, 운동복: 100000 },
};

describe('예산 진행', () => {
  it('쓴 돈·남은 돈·%와 이번 달 남은 날 (시안: 10월 19일 → 12일 남음)', () => {
    const progress = getBudgetProgress(
      OCTOBER,
      [expense(312300, '식비'), expense(100000, '쇼핑')],
      '2026-10-19',
    );
    expect(progress).toMatchObject({
      spent: 412300,
      total: 600000,
      remaining: 187700,
      percent: 69,
      isOver: false,
      daysLeft: 12,
    });
  });

  it('분류별: 예산을 정한 분류만, 넘으면 초과 (같으면 초과 아님). 기본 분류 순서 → 직접 입력 분류', () => {
    const progress = getBudgetProgress(
      OCTOBER,
      [expense(312300, '식비'), expense(50000, '카페')],
      '2026-10-19',
    );
    expect(progress.categories).toEqual([
      {
        name: '식비',
        spent: 312300,
        limit: 300000,
        percent: 104,
        isOver: true,
      },
      { name: '카페', spent: 50000, limit: 50000, percent: 100, isOver: false },
      { name: '운동복', spent: 0, limit: 100000, percent: 0, isOver: false },
    ]);
  });

  it('전체 예산이 없으면 남은 돈·%는 비우고, 넘으면 남은 돈이 음수', () => {
    const noTotal = getBudgetProgress(
      { ...OCTOBER, total: null },
      [expense(1000, '식비')],
      '2026-10-19',
    );
    expect(noTotal).toMatchObject({
      remaining: null,
      percent: null,
      isOver: false,
    });

    const over = getBudgetProgress(
      { ...OCTOBER, total: 1000 },
      [expense(1500, '식비')],
      '2026-10-19',
    );
    expect(over).toMatchObject({ remaining: -500, percent: 150, isOver: true });
  });

  it('남은 날: 지난 달은 없음, 다음 달은 그 달 전체, 말일은 0', () => {
    expect(getBudgetProgress(OCTOBER, [], '2026-11-02').daysLeft).toBeNull();
    expect(getBudgetProgress(OCTOBER, [], '2026-09-30').daysLeft).toBe(31);
    expect(getBudgetProgress(OCTOBER, [], '2026-10-31').daysLeft).toBe(0);
  });
});
