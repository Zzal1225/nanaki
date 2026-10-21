import { describe, expect, it } from 'vitest';
import { formatDisplayDate } from './formatDisplayDate';

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
