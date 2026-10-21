import { describe, expect, it } from 'vitest';
import {
  getKeyboardTarget,
  parseCalendarState,
  shiftPeriod,
  toCalendarHref,
  type CalendarState,
} from './calendarState';

const TODAY = '2026-10-21';

describe('parseCalendarState', () => {
  it('주소 값이 맞으면 그대로', () => {
    expect(
      parseCalendarState({ view: 'week', date: '2026-09-03' }, TODAY),
    ).toEqual({ view: 'week', date: '2026-09-03' });
  });
  it('값이 없으면 월 보기 + 오늘', () => {
    expect(parseCalendarState({ view: null, date: null }, TODAY)).toEqual({
      view: 'month',
      date: TODAY,
    });
  });
  it('틀린 값은 하나씩 기본값으로 (맞는 쪽은 살린다)', () => {
    expect(
      parseCalendarState({ view: 'abc', date: '2026-09-03' }, TODAY),
    ).toEqual({ view: 'month', date: '2026-09-03' });
    expect(
      parseCalendarState({ view: 'week', date: '2026-02-30' }, TODAY),
    ).toEqual({ view: 'week', date: TODAY });
  });
  it('상속 키 이름(toString)도 보기로 받지 않는다', () => {
    expect(
      parseCalendarState({ view: 'toString', date: null }, TODAY).view,
    ).toBe('month');
  });
});

describe('toCalendarHref', () => {
  it('월 보기는 view를 적지 않는다', () => {
    expect(toCalendarHref({ view: 'month', date: '2026-10-16' })).toBe(
      '/?date=2026-10-16',
    );
  });
  it('주 보기는 view=week', () => {
    expect(toCalendarHref({ view: 'week', date: '2026-10-16' })).toBe(
      '/?view=week&date=2026-10-16',
    );
  });
});

describe('shiftPeriod', () => {
  it('월 보기는 한 달씩, 없는 날은 말일로', () => {
    const state: CalendarState = { view: 'month', date: '2026-01-31' };
    expect(shiftPeriod(state, 1).date).toBe('2026-02-28');
    expect(shiftPeriod(state, -1).date).toBe('2025-12-31');
  });
  it('주 보기는 한 주씩', () => {
    const state: CalendarState = { view: 'week', date: '2026-10-21' };
    expect(shiftPeriod(state, 1)).toEqual({ view: 'week', date: '2026-10-28' });
  });
});

describe('getKeyboardTarget', () => {
  const state: CalendarState = { view: 'month', date: '2026-10-01' };

  it('방향키: 좌우 하루, 위아래 한 주 (달 경계를 넘는다)', () => {
    expect(getKeyboardTarget(state, 'ArrowLeft')).toBe('2026-09-30');
    expect(getKeyboardTarget(state, 'ArrowRight')).toBe('2026-10-02');
    expect(getKeyboardTarget(state, 'ArrowUp')).toBe('2026-09-24');
    expect(getKeyboardTarget(state, 'ArrowDown')).toBe('2026-10-08');
  });
  it('Home·End: 그 주의 일요일·토요일', () => {
    expect(getKeyboardTarget(state, 'Home')).toBe('2026-09-27');
    expect(getKeyboardTarget(state, 'End')).toBe('2026-10-03');
  });
  it('PageUp·PageDown: 이전·다음 기간 (shiftPeriod와 같은 규칙)', () => {
    expect(getKeyboardTarget(state, 'PageUp')).toBe('2026-09-01');
    expect(getKeyboardTarget({ ...state, view: 'week' }, 'PageDown')).toBe(
      '2026-10-08',
    );
  });
  it('다른 키는 null (Tab·Enter 등은 막지 않는다)', () => {
    expect(getKeyboardTarget(state, 'Tab')).toBeNull();
    expect(getKeyboardTarget(state, 'Enter')).toBeNull();
  });
});
