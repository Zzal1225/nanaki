import { describe, expect, it } from 'vitest';
import {
  goalToDraft,
  routineDraftSchema,
  scheduleToDraft,
  type GoalDraft,
  type ScheduleDraft,
} from './routineDraft';

const BASE = { name: '물 마시기', startDate: '2026-10-21' };
const CHECK: GoalDraft = { kind: 'check', targetCount: undefined, unit: '' };

describe('scheduleToDraft', () => {
  it('새 루틴은 매일, 매달 칸에는 시작일의 날짜를 미리', () => {
    expect(scheduleToDraft(undefined, '2026-10-21')).toEqual({
      kind: 'weekly',
      days: [0, 1, 2, 3, 4, 5, 6],
      day: 21,
    });
  });
});

describe('routineDraftSchema', () => {
  it('고른 종류의 칸만 남긴다 (요일 선택이면 day를 버림)', () => {
    const draft: ScheduleDraft = { kind: 'weekly', days: [1, 3], day: 15 };
    const result = routineDraftSchema.parse({
      ...BASE,
      schedule: draft,
      goal: CHECK,
    });
    expect(result.schedule).toEqual({ kind: 'weekly', days: [1, 3] });
    expect(result.goal).toEqual({ kind: 'check' });
  });
  it('매달을 고르면 day만', () => {
    const result = routineDraftSchema.parse({
      ...BASE,
      schedule: { kind: 'monthly', days: [1], day: 31 },
      goal: CHECK,
    });
    expect(result.schedule).toEqual({ kind: 'monthly', day: 31 });
  });
  it('횟수 목표의 단위를 비우면 기본 단위(회)로 저장', () => {
    const result = routineDraftSchema.parse({
      ...BASE,
      schedule: scheduleToDraft(undefined, BASE.startDate),
      goal: { kind: 'count', targetCount: 3, unit: '  ' },
    });
    expect(result.goal).toEqual({ kind: 'count', target: 3, unit: '회' });
  });
  it('오류는 칸 경로 그대로 (schedule.days, goal.target)', () => {
    const result = routineDraftSchema.safeParse({
      ...BASE,
      schedule: { kind: 'weekly', days: [], day: 1 },
      goal: { kind: 'count', targetCount: undefined, unit: '' },
    });
    const paths = result.error?.issues.map((issue) => issue.path.join('.'));
    expect(paths).toContain('schedule.days');
    expect(paths).toContain('goal.target');
  });
  it('저장된 목표를 다시 폼으로 (왕복)', () => {
    const goal = { kind: 'count', target: 8, unit: '잔' } as const;
    expect(
      routineDraftSchema.parse({
        ...BASE,
        schedule: scheduleToDraft(undefined, BASE.startDate),
        goal: goalToDraft(goal),
      }).goal,
    ).toEqual(goal);
  });
});
