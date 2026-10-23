import { describe, expect, it } from 'vitest';
import { fixedExpenseInputSchema } from '@/features/fixedExpenses/schema/fixedExpense';
import { buildSampleFixedExpenses } from './sampleFixedExpenses';

describe('체험 예시 고정지출', () => {
  it('어느 날에 시작해도 결제일이 오늘과 겹치지 않고 1~28일 (서버가 체험 계정에 오늘 기록을 더 만들지 않게)', () => {
    for (let day = 1; day <= 31; day += 1) {
      const today = `2026-10-${String(day).padStart(2, '0')}`;
      for (const item of buildSampleFixedExpenses(today)) {
        expect(item.schedule.day).not.toBe(day);
        expect(item.schedule.day).toBeGreaterThanOrEqual(1);
        expect(item.schedule.day).toBeLessThanOrEqual(28);
      }
    }
  });

  it('저장 규칙을 통과한다', () => {
    for (const item of buildSampleFixedExpenses('2026-10-23')) {
      expect(fixedExpenseInputSchema.safeParse(item).success).toBe(true);
    }
  });
});
