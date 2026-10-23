import { describe, expect, it } from 'vitest';
import {
  dueDateInMonth,
  isDueDatePassed,
  nextDueDate,
} from './fixedExpenseDates';

describe('고정지출 결제일', () => {
  it('그 달의 결제일. 없는 날은 말일 (31일 → 30일, 2월은 28·29일)', () => {
    expect(dueDateInMonth(5, '2026-10')).toBe('2026-10-05');
    expect(dueDateInMonth(31, '2026-11')).toBe('2026-11-30');
    expect(dueDateInMonth(31, '2026-02')).toBe('2026-02-28');
    expect(dueDateInMonth(30, '2028-02')).toBe('2028-02-29');
  });

  it('이번 달 결제일이 지났나: 오늘이 결제일이면 지나지 않음', () => {
    expect(isDueDatePassed(5, '2026-10-23')).toBe(true);
    expect(isDueDatePassed(23, '2026-10-23')).toBe(false);
    expect(isDueDatePassed(25, '2026-10-23')).toBe(false);
    // 31일 규칙의 11월 결제일은 30일
    expect(isDueDatePassed(31, '2026-11-30')).toBe(false);
  });

  it('다음 결제일: 이번 달 것이 남았으면 이번 달, 지났거나 이미 기록했으면 다음 달', () => {
    expect(nextDueDate(25, '2026-10-23', null)).toBe('2026-10-25');
    expect(nextDueDate(5, '2026-10-23', '2026-09-05')).toBe('2026-11-05');
    expect(nextDueDate(23, '2026-10-23', null)).toBe('2026-10-23');
    // 오늘이 결제일이지만 이미 기록함
    expect(nextDueDate(23, '2026-10-23', '2026-10-23')).toBe('2026-11-23');
    // 12월 → 다음 해 1월
    expect(nextDueDate(5, '2026-12-20', null)).toBe('2027-01-05');
  });
});
