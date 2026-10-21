import { describe, expect, it } from 'vitest';
import {
  formatDisplayDate,
  formatMonthDayLabel,
  formatShortDate,
} from './formatDisplayDate';

describe('formatDisplayDate', () => {
  it('시안 모양 YYYY. MM. DD (요일)', () => {
    expect(formatDisplayDate('2026-10-16')).toBe('2026. 10. 16 (금)');
  });
  it('일요일·토요일 끝자리 요일', () => {
    expect(formatDisplayDate('2026-10-18')).toBe('2026. 10. 18 (일)');
    expect(formatDisplayDate('2026-10-17')).toBe('2026. 10. 17 (토)');
  });
  it('빈 값·형식이 틀린 값은 빈 글자', () => {
    expect(formatDisplayDate('')).toBe('');
    expect(formatDisplayDate('2026/10/16')).toBe('');
  });
});

describe('formatShortDate', () => {
  it('시안 모양 MM.DD (요일)', () => {
    expect(formatShortDate('2026-10-19')).toBe('10.19 (월)');
  });
  it('형식이 틀리면 빈 글자', () => {
    expect(formatShortDate('')).toBe('');
  });
});

describe('formatMonthDayLabel', () => {
  it('시안 모양 M월 D일 (요일), 앞자리 0 없음', () => {
    expect(formatMonthDayLabel('2026-10-16')).toBe('10월 16일 (금)');
    expect(formatMonthDayLabel('2026-03-05')).toBe('3월 5일 (목)');
  });
  it('형식이 틀리면 빈 글자', () => {
    expect(formatMonthDayLabel('')).toBe('');
  });
});
