import { describe, expect, it } from 'vitest';
import { getMonthRange } from './monthRange';

describe('getMonthRange', () => {
  it('31일까지 있는 달', () => {
    expect(getMonthRange(new Date(2026, 9, 21))).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    });
  });
  it('30일까지 있는 달', () => {
    expect(getMonthRange(new Date(2026, 10, 5)).to).toBe('2026-11-30');
  });
  it('2월 (평년 28일, 윤년 29일)', () => {
    expect(getMonthRange(new Date(2026, 1, 10)).to).toBe('2026-02-28');
    expect(getMonthRange(new Date(2028, 1, 10)).to).toBe('2028-02-29');
  });
  it('12월 → 해가 넘어가도 말일은 12월 31일', () => {
    expect(getMonthRange(new Date(2026, 11, 31))).toEqual({
      from: '2026-12-01',
      to: '2026-12-31',
    });
  });
});
