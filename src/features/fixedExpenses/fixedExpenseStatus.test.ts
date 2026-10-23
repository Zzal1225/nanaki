import { describe, expect, it } from 'vitest';
import {
  formatFixedExpenseStatus,
  getFixedExpenseStatus,
  sumFixedExpenses,
} from './fixedExpenseStatus';

function monthly(day: number, lastRecordedOn: string | null = null) {
  return { schedule: { kind: 'monthly' as const, day }, lastRecordedOn };
}

describe('고정지출 상태', () => {
  it('이번 달에 기록했으면 "기록됨" (결제일이 지났든 아니든)', () => {
    expect(
      getFixedExpenseStatus(monthly(5, '2026-10-05'), '2026-10-23'),
    ).toEqual({ kind: 'recorded' });
  });

  it('결제일이 남았으면 남은 날, 오늘이면 "오늘"', () => {
    expect(getFixedExpenseStatus(monthly(25), '2026-10-23')).toEqual({
      kind: 'upcoming',
      daysLeft: 2,
    });
    expect(getFixedExpenseStatus(monthly(23), '2026-10-23')).toEqual({
      kind: 'today',
    });
  });

  it('이번 달 결제일이 지났는데 기록이 없으면(추가하기 전 날짜) 다음 달까지 남은 날', () => {
    expect(getFixedExpenseStatus(monthly(5), '2026-10-23')).toEqual({
      kind: 'upcoming',
      daysLeft: 13,
    });
  });

  it('문구 (시안 18)', () => {
    expect(formatFixedExpenseStatus({ kind: 'recorded' })).toBe('기록됨');
    expect(formatFixedExpenseStatus({ kind: 'today' })).toBe('오늘 기록돼요');
    expect(formatFixedExpenseStatus({ kind: 'upcoming', daysLeft: 1 })).toBe(
      '1일 남음',
    );
  });

  it('이번 달 합계', () => {
    expect(sumFixedExpenses([{ amount: 55000 }, { amount: 13500 }])).toBe(
      68500,
    );
  });
});
