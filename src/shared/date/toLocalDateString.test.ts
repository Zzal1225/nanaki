import { describe, expect, it } from 'vitest';
import { fromLocalDateString, toLocalDateString } from './toLocalDateString';

// new Date(연, 월-1, 일, 시)는 "이 컴퓨터의 시간대" 기준으로 만든다.
// 그래서 어느 시간대에서 테스트를 돌려도 로컬 날짜가 그대로 나와야 한다
describe('toLocalDateString', () => {
  it('YYYY-MM-DD 모양으로 만든다', () => {
    expect(toLocalDateString(new Date(2026, 9, 21, 12))).toBe('2026-10-21');
  });
  it('한 자리 월·일 앞에 0을 붙인다', () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });
  // toISOString을 쓰면 한국 시간 자정 무렵에 UTC로 바뀌어 하루가 밀린다
  it('자정 직후·직전도 로컬 날짜 그대로', () => {
    expect(toLocalDateString(new Date(2026, 9, 21, 0, 30))).toBe('2026-10-21');
    expect(toLocalDateString(new Date(2026, 9, 21, 23, 30))).toBe('2026-10-21');
  });
});

describe('fromLocalDateString', () => {
  it('로컬 날짜로 읽는다 (UTC로 읽어 하루 밀리지 않는다)', () => {
    const date = fromLocalDateString('2026-10-01');
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([
      2026, 9, 1,
    ]);
  });
  it('toLocalDateString과 왕복해도 같다', () => {
    expect(toLocalDateString(fromLocalDateString('2028-02-29'))).toBe(
      '2028-02-29',
    );
  });
});
