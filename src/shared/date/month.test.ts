import { describe, expect, it } from 'vitest';
import {
  formatMonthLabel,
  formatYearMonthLabel,
  getMonthRangeOf,
  parseMonthParam,
  shiftMonth,
  toMonthString,
} from './month';

describe('parseMonthParam', () => {
  it('YYYY-MM이면 그대로', () => {
    expect(parseMonthParam('2026-10')).toBe('2026-10');
  });
  it('모양이 틀리거나 없는 달이면 null (이번 달로 대신)', () => {
    expect(parseMonthParam('2026-13')).toBeNull();
    expect(parseMonthParam('2026-00')).toBeNull();
    expect(parseMonthParam('2026-1')).toBeNull();
    expect(parseMonthParam(undefined)).toBeNull();
    expect(parseMonthParam(['2026-10'])).toBeNull();
  });
});

describe('shiftMonth', () => {
  it('앞뒤 달', () => {
    expect(shiftMonth('2026-10', -1)).toBe('2026-09');
    expect(shiftMonth('2026-10', 1)).toBe('2026-11');
  });
  it('해가 바뀌는 경계', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });
});

describe('getMonthRangeOf', () => {
  it('그 달의 첫날~말일', () => {
    expect(getMonthRangeOf('2028-02')).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
    });
  });
});

describe('toMonthString · formatMonthLabel', () => {
  it("'YYYY-MM-DD' → 'YYYY-MM'", () => {
    expect(toMonthString('2026-10-21')).toBe('2026-10');
  });
  it('올해면 월만, 아니면 연도까지', () => {
    expect(formatMonthLabel('2026-10', '2026-10')).toBe('10월');
    expect(formatMonthLabel('2025-12', '2026-01')).toBe('2025년 12월');
  });
});

describe('formatYearMonthLabel', () => {
  it('연도를 늘 붙인다', () => {
    expect(formatYearMonthLabel('2026-10')).toBe('2026년 10월');
    expect(formatYearMonthLabel('2027-01')).toBe('2027년 1월');
  });
});
