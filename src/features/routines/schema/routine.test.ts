import { describe, expect, it } from 'vitest';
import {
  formatGoal,
  goalSchema,
  isActiveOn,
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
