import { describe, expect, it } from 'vitest';
import {
  addDaysTo,
  addMonthsTo,
  addWeeksTo,
  endOfWeekOf,
  getMonthGrid,
  getWeekDays,
  isDateString,
  startOfWeekOf,
} from './calendar';

describe('isDateString', () => {
  it('있는 날짜면 true', () => {
    expect(isDateString('2026-10-21')).toBe(true);
    expect(isDateString('2028-02-29')).toBe(true);
  });
  it('모양이 틀리거나 없는 날짜면 false', () => {
    expect(isDateString('2026-02-30')).toBe(false);
    expect(isDateString('2026-02-29')).toBe(false);
    expect(isDateString('2026-13-01')).toBe(false);
    expect(isDateString('2026-1-5')).toBe(false);
    expect(isDateString(undefined)).toBe(false);
    expect(isDateString(['2026-10-21'])).toBe(false);
  });
});

describe('날짜 더하기', () => {
  it('하루·한 주 단위로 달과 해를 넘는다', () => {
    expect(addDaysTo('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDaysTo('2026-01-01', -1)).toBe('2025-12-31');
    expect(addWeeksTo('2026-12-28', 1)).toBe('2027-01-04');
  });
  it('달을 더하면 없는 날은 그 달 말일로 맞춘다', () => {
    expect(addMonthsTo('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsTo('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonthsTo('2026-12-16', 1)).toBe('2027-01-16');
  });
});

describe('주의 시작·끝 (일요일 시작)', () => {
  it('2026-10-21(수) → 10-18(일) ~ 10-24(토)', () => {
    expect(startOfWeekOf('2026-10-21')).toBe('2026-10-18');
    expect(endOfWeekOf('2026-10-21')).toBe('2026-10-24');
  });
  it('일요일이면 그날이 시작', () => {
    expect(startOfWeekOf('2026-10-18')).toBe('2026-10-18');
  });
});

describe('getWeekDays', () => {
  it('그 주 일요일~토요일 7일, 달이 걸쳐도', () => {
    expect(getWeekDays('2026-10-01')).toEqual([
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
    ]);
  });
});

describe('getMonthGrid', () => {
  it('2026년 10월: 9/27(일)부터 10/31(토)까지 5주', () => {
    const weeks = getMonthGrid('2026-10-16');
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toBe('2026-09-27');
    expect(weeks[0][4]).toBe('2026-10-01');
    expect(weeks[4][6]).toBe('2026-10-31');
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });
  it('6주가 필요한 달 (2026년 8월: 1일 토요일, 31일 월요일)', () => {
    const weeks = getMonthGrid('2026-08-01');
    expect(weeks).toHaveLength(6);
    expect(weeks[5][6]).toBe('2026-09-05');
  });
  it('4주로 딱 맞는 달 (2026년 2월: 1일 일요일, 평년)', () => {
    expect(getMonthGrid('2026-02-10')).toHaveLength(4);
  });
});
