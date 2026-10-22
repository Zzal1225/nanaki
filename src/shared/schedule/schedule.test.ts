import { describe, expect, it } from 'vitest';
import {
  type Schedule,
  formatSchedule,
  isScheduledOn,
  listScheduledDates,
  scheduleSchema,
} from './schedule';

describe('isScheduledOn: 요일 반복', () => {
  // 2026-10-19 = 월요일
  const monWedFri: Schedule = { kind: 'weekly', days: [1, 3, 5] };

  it('고른 요일만', () => {
    expect(isScheduledOn(monWedFri, '2026-10-19')).toBe(true);
    expect(isScheduledOn(monWedFri, '2026-10-20')).toBe(false);
    expect(isScheduledOn(monWedFri, '2026-10-21')).toBe(true);
  });
  it('일요일은 0 (Date.getDay와 같은 번호)', () => {
    expect(isScheduledOn({ kind: 'weekly', days: [0] }, '2026-10-18')).toBe(
      true,
    );
  });
});

describe('isScheduledOn: 매달 n일', () => {
  it('그 날짜에만', () => {
    const fifteenth = { kind: 'monthly', day: 15 } as const;
    expect(isScheduledOn(fifteenth, '2026-10-15')).toBe(true);
    expect(isScheduledOn(fifteenth, '2026-10-16')).toBe(false);
  });
  it('31일 규칙: 31일이 없는 달은 말일 (30일 달, 2월)', () => {
    const last = { kind: 'monthly', day: 31 } as const;
    expect(isScheduledOn(last, '2026-10-31')).toBe(true);
    expect(isScheduledOn(last, '2026-11-30')).toBe(true);
    expect(isScheduledOn(last, '2026-11-29')).toBe(false);
    expect(isScheduledOn(last, '2027-02-28')).toBe(true);
  });
  it('윤년 2월은 29일이 말일', () => {
    const last = { kind: 'monthly', day: 31 } as const;
    expect(isScheduledOn(last, '2028-02-28')).toBe(false);
    expect(isScheduledOn(last, '2028-02-29')).toBe(true);
  });
  it('30일 규칙은 31일 달에는 30일 (말일로 당기지 않는다)', () => {
    const thirtieth = { kind: 'monthly', day: 30 } as const;
    expect(isScheduledOn(thirtieth, '2026-10-30')).toBe(true);
    expect(isScheduledOn(thirtieth, '2026-10-31')).toBe(false);
  });
});

describe('listScheduledDates', () => {
  it('기간(양 끝 포함) 안의 규칙 날짜, 달을 넘어가도', () => {
    expect(
      listScheduledDates(
        { kind: 'weekly', days: [1] },
        '2026-10-26',
        '2026-11-09',
      ),
    ).toEqual(['2026-10-26', '2026-11-02', '2026-11-09']);
  });
  it('시작이 끝보다 늦으면 빈 목록', () => {
    expect(
      listScheduledDates(
        { kind: 'monthly', day: 1 },
        '2026-11-01',
        '2026-10-01',
      ),
    ).toEqual([]);
  });
});

describe('scheduleSchema', () => {
  it('요일은 하나 이상, 0~6, 겹치지 않게', () => {
    expect(scheduleSchema.safeParse({ kind: 'weekly', days: [] }).success).toBe(
      false,
    );
    expect(
      scheduleSchema.safeParse({ kind: 'weekly', days: [7] }).success,
    ).toBe(false);
    expect(
      scheduleSchema.safeParse({ kind: 'weekly', days: [1, 1] }).success,
    ).toBe(false);
  });
  it('매달은 1~31일', () => {
    expect(scheduleSchema.safeParse({ kind: 'monthly', day: 31 }).success).toBe(
      true,
    );
    expect(scheduleSchema.safeParse({ kind: 'monthly', day: 0 }).success).toBe(
      false,
    );
    expect(scheduleSchema.safeParse({ kind: 'monthly', day: 32 }).success).toBe(
      false,
    );
  });
});

describe('formatSchedule', () => {
  it('요일은 일요일부터 순서대로, 모든 요일이면 매일, 매달은 n일', () => {
    expect(formatSchedule({ kind: 'weekly', days: [5, 1, 3] })).toBe(
      '월·수·금',
    );
    expect(
      formatSchedule({ kind: 'weekly', days: [0, 1, 2, 3, 4, 5, 6] }),
    ).toBe('매일');
    expect(formatSchedule({ kind: 'monthly', day: 31 })).toBe('매달 31일');
  });
});
