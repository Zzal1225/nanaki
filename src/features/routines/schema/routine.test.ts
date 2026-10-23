import { describe, expect, it } from 'vitest';
import {
  formatGoal,
  formatRemindTime,
  goalSchema,
  isActiveOn,
  listRemindTimes,
  routineSchema,
  toEndedOn,
  type Routine,
} from './routine';

const ROUTINE: Routine = {
  id: '3f0e3f5a-8f6f-4c2b-9a51-0d7b2f9e6c11',
  name: '물 마시기',
  startDate: '2026-10-10',
  schedule: { kind: 'weekly', days: [0, 1, 2, 3, 4, 5, 6] },
  goal: { kind: 'count', target: 8, unit: '잔' },
  endedOn: null,
  remindAt: null,
};

describe('routineSchema', () => {
  it('이름은 필수 (공백만이면 실패)', () => {
    expect(routineSchema.safeParse({ ...ROUTINE, name: '  ' }).success).toBe(
      false,
    );
  });
  it('횟수 목표는 2번 이상 (1번이면 체크형을 쓴다)', () => {
    expect(
      goalSchema.safeParse({ kind: 'count', target: 1, unit: '' }).success,
    ).toBe(false);
    expect(
      goalSchema.safeParse({ kind: 'count', target: 2, unit: '' }).success,
    ).toBe(true);
  });
});

describe('알림 시각 (10분 단위, 한국 시각 HH:MM)', () => {
  it('10분 단위만 받는다 (DB check와 같은 규칙)', () => {
    const parse = (remindAt: string | null) =>
      routineSchema.safeParse({ ...ROUTINE, remindAt }).success;
    expect(parse(null)).toBe(true);
    expect(parse('00:00')).toBe(true);
    expect(parse('21:30')).toBe(true);
    expect(parse('23:50')).toBe(true);
    expect(parse('21:35')).toBe(false);
    expect(parse('24:00')).toBe(false);
    expect(parse('9:00')).toBe(false);
  });

  it('고르기 칸: 10분마다 144개, 표기는 오전·오후 12시간제', () => {
    const times = listRemindTimes();
    expect(times).toHaveLength(144);
    expect(times[0]).toBe('00:00');
    expect(times.at(-1)).toBe('23:50');
    expect(formatRemindTime('00:00')).toBe('오전 12:00');
    expect(formatRemindTime('09:00')).toBe('오전 9:00');
    expect(formatRemindTime('12:00')).toBe('오후 12:00');
    expect(formatRemindTime('21:30')).toBe('오후 9:30');
  });
});

describe('isActiveOn', () => {
  it('시작일부터, 그만둔 날 전까지 (그만둔 날은 포함하지 않음)', () => {
    const ended = { ...ROUTINE, endedOn: '2026-10-20' };
    expect(isActiveOn(ended, '2026-10-09')).toBe(false);
    expect(isActiveOn(ended, '2026-10-10')).toBe(true);
    expect(isActiveOn(ended, '2026-10-19')).toBe(true);
    expect(isActiveOn(ended, '2026-10-20')).toBe(false);
  });
  it('그만두지 않았으면 시작일 이후 계속', () => {
    expect(isActiveOn(ROUTINE, '2027-01-01')).toBe(true);
  });
});

describe('toEndedOn', () => {
  it('보통은 오늘, 아직 시작 전이면 시작일 (DB: 그만둔 날 >= 시작일)', () => {
    expect(toEndedOn(ROUTINE, '2026-10-21')).toBe('2026-10-21');
    expect(toEndedOn(ROUTINE, '2026-10-01')).toBe('2026-10-10');
  });
});

describe('formatGoal', () => {
  it('체크 / 하루 n단위', () => {
    expect(formatGoal({ kind: 'check' })).toBe('체크');
    expect(formatGoal({ kind: 'count', target: 8, unit: '잔' })).toBe(
      '하루 8잔',
    );
  });
});
