import { describe, expect, it } from 'vitest';
import { isActivePath } from './isActivePath';

describe('isActivePath', () => {
  it('홈에 있으면 홈 메뉴가 선택됨', () => {
    expect(isActivePath('/', '/')).toBe(true);
  });
  it('기록에 있으면 홈 메뉴가 선택안됨', () => {
    expect(isActivePath('/records', '/')).toBe(false);
  });
  it('기록에 있으면 기록 메뉴가 선택됨', () => {
    expect(isActivePath('/records', '/records')).toBe(true);
  });
  it('기록 상세에 있으면 기록 메뉴가 선택됨', () => {
    expect(isActivePath('/records/abc', '/records')).toBe(true);
  });
  it('이름만 비슷한 주소에 있으면 기록 메뉴가 선택 안됨', () => {
    expect(isActivePath('/recordsx', '/records')).toBe(false);
  });
  it('나키에 있으면 기록 메뉴가 선택 안됨', () => {
    expect(isActivePath('/naki', '/records')).toBe(false);
  });
  it('예산 화면에 있으면 기록 메뉴가 선택됨 (가계부에서 들어가는 화면)', () => {
    expect(isActivePath('/budget', '/records')).toBe(true);
    expect(isActivePath('/budget', '/')).toBe(false);
    expect(isActivePath('/budgetx', '/records')).toBe(false);
    expect(isActivePath('/fixed-expenses', '/records')).toBe(true);
  });
});
