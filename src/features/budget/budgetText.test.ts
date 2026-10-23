import { describe, expect, it } from 'vitest';
import {
  barWidthPercent,
  budgetRemainingShortText,
  budgetRemainingText,
  inheritedBudgetNotice,
  overAmountText,
} from './budgetText';

describe('예산 문구', () => {
  it('카드: 남은 돈 · 남은 날 (시안 13a)', () => {
    expect(budgetRemainingText({ remaining: 187700, daysLeft: 12 })).toBe(
      '187,700원 남았어요 · 12일 남음',
    );
  });

  it('카드: 말일은 "오늘이 마지막 날", 지난 달은 "남겼어요", 넘으면 "넘었어요"', () => {
    expect(budgetRemainingText({ remaining: 1000, daysLeft: 0 })).toBe(
      '1,000원 남았어요 · 오늘이 마지막 날',
    );
    expect(budgetRemainingText({ remaining: 1000, daysLeft: null })).toBe(
      '1,000원 남겼어요',
    );
    expect(budgetRemainingText({ remaining: -12300, daysLeft: 3 })).toBe(
      '12,300원 넘었어요',
    );
  });

  it('전체 예산이 없으면 문구 없음', () => {
    expect(budgetRemainingText({ remaining: null, daysLeft: 3 })).toBeNull();
    expect(
      budgetRemainingShortText({ remaining: null, daysLeft: 3 }),
    ).toBeNull();
  });

  it('예산 화면: 짧은 문구 (시안 18)', () => {
    expect(budgetRemainingShortText({ remaining: 187700, daysLeft: 12 })).toBe(
      '187,700원 남음 · 12일',
    );
    expect(budgetRemainingShortText({ remaining: 5, daysLeft: 0 })).toBe(
      '5원 남음 · 오늘까지',
    );
    expect(budgetRemainingShortText({ remaining: -500, daysLeft: 12 })).toBe(
      '500원 초과',
    );
    expect(budgetRemainingShortText({ remaining: 0, daysLeft: null })).toBe(
      '0원 남음',
    );
  });

  it('분류 초과 금액', () => {
    expect(overAmountText(156700, 150000)).toBe('6,700원 초과');
  });

  it('이어받은 예산 안내: 해가 다르면 연도까지', () => {
    expect(inheritedBudgetNotice('2026-09', '2026-10', '2026-10')).toBe(
      '9월 예산을 이어받았어요. 바꾸면 10월 예산으로 저장돼요.',
    );
    expect(inheritedBudgetNotice('2025-12', '2026-01', '2026-01')).toBe(
      '2025년 12월 예산을 이어받았어요. 바꾸면 1월 예산으로 저장돼요.',
    );
  });

  it('막대 길이는 100%에서 멈춘다', () => {
    expect(barWidthPercent(69)).toBe(69);
    expect(barWidthPercent(150)).toBe(100);
  });
});
