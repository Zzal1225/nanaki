import { describe, expect, it } from 'vitest';
import {
  getKeyboardTarget,
  parseCalendarDate,
  shiftMonth,
  toCalendarHref,
} from './calendarState';

const TODAY = '2026-10-21';

describe('parseCalendarDate', () => {
  it('주소 날짜가 맞으면 그대로', () => {
    expect(parseCalendarDate('2026-09-03', TODAY)).toBe('2026-09-03');
  });
  it('없거나 없는 날짜면 오늘', () => {
    expect(parseCalendarDate(null, TODAY)).toBe(TODAY);
    expect(parseCalendarDate('2026-02-30', TODAY)).toBe(TODAY);
    expect(parseCalendarDate('abc', TODAY)).toBe(TODAY);
  });
});

describe('toCalendarHref', () => {
  it('/?date=YYYY-MM-DD', () => {
    expect(toCalendarHref('2026-10-16')).toBe('/?date=2026-10-16');
  });
});

describe('shiftMonth', () => {
  it('한 달씩, 없는 날은 말일로', () => {
    expect(shiftMonth('2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftMonth('2026-01-31', -1)).toBe('2025-12-31');
  });
});

describe('getKeyboardTarget', () => {
  const date = '2026-10-01';

  it('방향키: 좌우 하루, 위아래 한 주 (달 경계를 넘는다)', () => {
    expect(getKeyboardTarget(date, 'ArrowLeft')).toBe('2026-09-30');
    expect(getKeyboardTarget(date, 'ArrowRight')).toBe('2026-10-02');
    expect(getKeyboardTarget(date, 'ArrowUp')).toBe('2026-09-24');
    expect(getKeyboardTarget(date, 'ArrowDown')).toBe('2026-10-08');
  });
  it('Home·End: 그 주의 일요일·토요일', () => {
    expect(getKeyboardTarget(date, 'Home')).toBe('2026-09-27');
    expect(getKeyboardTarget(date, 'End')).toBe('2026-10-03');
  });
  it('PageUp·PageDown: 이전·다음 달 (shiftMonth와 같은 규칙)', () => {
    expect(getKeyboardTarget(date, 'PageUp')).toBe('2026-09-01');
    expect(getKeyboardTarget(date, 'PageDown')).toBe('2026-11-01');
  });
  it('다른 키는 null (Tab·Enter 등은 막지 않는다)', () => {
    expect(getKeyboardTarget(date, 'Tab')).toBeNull();
    expect(getKeyboardTarget(date, 'Enter')).toBeNull();
  });
});
