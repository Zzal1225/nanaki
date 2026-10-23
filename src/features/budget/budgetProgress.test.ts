import { describe, expect, it } from 'vitest';
import type { RecordEntryOf } from '@/features/records/schema/recordEntry';
import { getBudgetProgress, sortCategoryNames } from './budgetProgress';

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

  it('예산 없는 분류: 돈을 쓴 분류 중 예산을 정하지 않은 것만, 같은 순서 (상속 키 이름도 분류로 본다)', () => {
    const progress = getBudgetProgress(
      OCTOBER,
      [
        expense(1000, '기타'),
        expense(2000, '식비'),
        expense(3000, '교통'),
        expense(500, 'constructor'),
        expense(700, '교통'),
      ],
      '2026-10-19',
    );
    expect(progress.unbudgeted).toEqual([
      { name: '교통', spent: 3700 },
      { name: '기타', spent: 1000 },
      { name: 'constructor', spent: 500 },
    ]);
  });

  it('분류 이름 정렬: 기본 분류 순서 → 나머지는 이름 순, 겹친 이름은 하나', () => {
    expect(
      sortCategoryNames(['운동복', '기타', '식비', '간식', '식비']),
    ).toEqual(['식비', '기타', '간식', '운동복']);
  });
});
