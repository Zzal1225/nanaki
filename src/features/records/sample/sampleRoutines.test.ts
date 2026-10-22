import { describe, expect, it } from 'vitest';
import { getAchievement, getDayRoutines } from '@/features/routines/progress';
import { routineSchema } from '@/features/routines/schema/routine';
import { recordEntrySchema, type RecordEntryOf } from '../schema/recordEntry';
import { buildSampleRoutines } from './sampleRoutines';

const TODAY = '2026-10-21';
const IDS = {
  water: '11111111-1111-4111-8111-111111111111',
  stretch: '22222222-2222-4222-8222-222222222222',
};

describe('buildSampleRoutines', () => {
  const { routines, checks } = buildSampleRoutines(TODAY, IDS);

  // 저장 직전에 같은 스키마로 다시 검사한다. 어긋나면 체험 시작 때 루틴·체크가 전부 빠진다
  it('루틴·체크 모두 스키마를 통과하고, 체크는 넘겨받은 루틴 id를 가리킨다', () => {
    for (const routine of routines) {
      expect(routineSchema.safeParse(routine).success).toBe(true);
    }
    for (const check of checks) {
      expect(
        recordEntrySchema.safeParse({ ...check, id: crypto.randomUUID() })
          .success,
      ).toBe(true);
    }
    expect(
      new Set(checks.map((c) => c.type === 'routine' && c.fields.routineId)),
    ).toEqual(new Set([IDS.water, IDS.stretch]));
  });

  it('오늘 할 루틴이 보이고, 물 마시기는 진행 중(3/8잔)', () => {
    const typed = checks.map((check, index) => ({
      ...check,
      id: String(index),
    })) as RecordEntryOf<'routine'>[];
    const today = getDayRoutines(routines, typed, TODAY);
    const water = today.find((item) => item.routine.id === IDS.water);
    expect(water).toMatchObject({ count: 3, target: 8, isDone: false });
  });

  it('미래 날짜 체크는 없고, 달성률이 나온다', () => {
    expect(checks.every((check) => check.occurredAt <= TODAY)).toBe(true);
    const typed = checks.map((check, index) => ({
      ...check,
      id: String(index),
    })) as RecordEntryOf<'routine'>[];
    const { rate } = getAchievement(routines, typed, {
      from: '2026-10-01',
      to: TODAY,
    });
    expect(rate).not.toBeNull();
  });
});
