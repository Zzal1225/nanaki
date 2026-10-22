import { describe, expect, it } from 'vitest';
import { formatPreviousMonthComparison } from './ExpenseSummaryCard';

describe('formatPreviousMonthComparison', () => {
  it('덜 썼으면 "덜", 더 썼으면 "더" (금액은 부호 없이)', () => {
    expect(formatPreviousMonthComparison(-12000)).toBe(
      '지난달 같은 기간보다 12,000원 덜 썼어요',
    );
    expect(formatPreviousMonthComparison(3500)).toBe(
      '지난달 같은 기간보다 3,500원 더 썼어요',
    );
  });
  it('같으면 "같아요"', () => {
    expect(formatPreviousMonthComparison(0)).toBe('지난달 같은 기간과 같아요');
  });
});
