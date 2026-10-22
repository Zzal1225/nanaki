import { describe, expect, it } from 'vitest';
import {
  budgetSchema,
  emptyBudget,
  hasAnyBudget,
  MAX_BUDGET_CATEGORIES,
} from './budget';

const VALID = { month: '2026-10', total: 600000, categories: { 식비: 300000 } };

describe('예산 스키마', () => {
  it('전체·분류 예산을 받고, 전체 예산은 비워도 된다', () => {
    expect(budgetSchema.safeParse(VALID).success).toBe(true);
    expect(budgetSchema.safeParse({ ...VALID, total: null }).success).toBe(
      true,
    );
  });

  it('틀린 달, 0 이하·소수·상한 초과 금액은 실패', () => {
    expect(budgetSchema.safeParse({ ...VALID, month: '2026-13' }).success).toBe(
      false,
    );
    expect(budgetSchema.safeParse({ ...VALID, total: 0 }).success).toBe(false);
    expect(budgetSchema.safeParse({ ...VALID, total: 1.5 }).success).toBe(
      false,
    );
    expect(
      budgetSchema.safeParse({ ...VALID, categories: { 식비: 100_000_000 } })
        .success,
    ).toBe(false);
  });

  it('분류 이름은 앞뒤 공백을 빼고, 빈 이름·너무 많은 분류는 실패', () => {
    const parsed = budgetSchema.parse({
      ...VALID,
      categories: { ' 카페 ': 50000 },
    });
    expect(parsed.categories).toEqual({ 카페: 50000 });
    expect(
      budgetSchema.safeParse({ ...VALID, categories: { ' ': 1000 } }).success,
    ).toBe(false);
    const many = Object.fromEntries(
      Array.from({ length: MAX_BUDGET_CATEGORIES + 1 }, (_, i) => [
        `분류${i}`,
        1000,
      ]),
    );
    expect(budgetSchema.safeParse({ ...VALID, categories: many }).success).toBe(
      false,
    );
  });

  it('빈 예산과 예산이 있는지', () => {
    expect(hasAnyBudget(emptyBudget('2026-10'))).toBe(false);
    expect(hasAnyBudget({ ...emptyBudget('2026-10'), total: 1000 })).toBe(true);
    expect(
      hasAnyBudget({ ...emptyBudget('2026-10'), categories: { 식비: 1 } }),
    ).toBe(true);
  });
});
