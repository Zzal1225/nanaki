import { describe, expect, it } from 'vitest';
import { applyCategoriesDraft, applyTotalDraft } from './budgetDraft';

const BUDGET = {
  month: '2026-10',
  total: 600000,
  categories: { 식비: 300000 },
};

describe('예산 편집 입력값', () => {
  it('전체 예산: 숫자는 그대로, 빈 칸은 예산 없음(null)', () => {
    expect(applyTotalDraft(BUDGET, 500000)).toEqual({
      ok: true,
      budget: { ...BUDGET, total: 500000 },
    });
    expect(applyTotalDraft(BUDGET, undefined)).toEqual({
      ok: true,
      budget: { ...BUDGET, total: null },
    });
  });

  it('전체 예산: 0과 상한 초과는 오류 (빈 칸과 다르다)', () => {
    expect(applyTotalDraft(BUDGET, 0)).toEqual({
      ok: false,
      errors: '0보다 큰 값을 입력해 주세요',
    });
    expect(applyTotalDraft(BUDGET, 100_000_000).ok).toBe(false);
  });

  it('분류별: 빈 칸은 빼고, 전체 예산은 그대로 둔다', () => {
    expect(
      applyCategoriesDraft(BUDGET, { 식비: undefined, 카페: 50000 }),
    ).toEqual({
      ok: true,
      budget: { ...BUDGET, categories: { 카페: 50000 } },
    });
  });

  it('분류별: 잘못된 칸만 오류', () => {
    expect(applyCategoriesDraft(BUDGET, { 식비: 0, 카페: 50000 })).toEqual({
      ok: false,
      errors: { 식비: '0보다 큰 값을 입력해 주세요' },
    });
  });
});
