import { describe, expect, it } from 'vitest';
import type { RecordEntryOf } from '@/features/records/schema/recordEntry';
import { getDayRoutines, getPerfectDays } from './progress';
import type { Routine } from './schema/routine';

const WATER: Routine = {
  id: '11111111-1111-4111-8111-111111111111',
  name: '물 마시기',
  startDate: '2026-10-01',
  // 매일
  schedule: { kind: 'weekly', days: [0, 1, 2, 3, 4, 5, 6] },
  goal: { kind: 'count', target: 8, unit: '잔' },
  endedOn: null,
  remindAt: null,
};
// 월·수·금 (2026-10-19 = 월요일)
const STRETCH: Routine = {
  id: '22222222-2222-4222-8222-222222222222',
  name: '스트레칭',
  startDate: '2026-10-01',
  schedule: { kind: 'weekly', days: [1, 3, 5] },
  goal: { kind: 'check' },
  endedOn: null,
  remindAt: null,
};

function check(
  routine: Routine,
  date: string,
  count: number,
  target = routine.goal.kind === 'check' ? 1 : routine.goal.target,
): RecordEntryOf<'routine'> {
  return {
    id: `${routine.id}-${date}`,
    type: 'routine',
    occurredAt: date,
    title: routine.name,
    memo: null,
    tags: [],
    fields: { routineId: routine.id, count, target, unit: '' },
  };
}

describe('getDayRoutines', () => {
  it('그날 일정인 루틴만, 체크가 없으면 0', () => {
    // 2026-10-20 = 화요일 → 스트레칭(월·수·금)은 없다
    const items = getDayRoutines([WATER, STRETCH], [], '2026-10-20');
    expect(items.map((item) => item.routine.name)).toEqual(['물 마시기']);
    expect(items[0]).toMatchObject({ count: 0, target: 8, isDone: false });
  });
  it('체크한 횟수와 완료 여부', () => {
    const items = getDayRoutines(
      [WATER, STRETCH],
      [check(WATER, '2026-10-19', 5), check(STRETCH, '2026-10-19', 1)],
      '2026-10-19',
    );
    expect(items.map(({ count, isDone }) => ({ count, isDone }))).toEqual([
      { count: 5, isDone: false },
      { count: 1, isDone: true },
    ]);
  });
  it('시작 전·그만둔 날부터는 나오지 않는다', () => {
    const ended = { ...WATER, endedOn: '2026-10-20' };
    expect(getDayRoutines([ended], [], '2026-09-30')).toEqual([]);
    expect(getDayRoutines([ended], [], '2026-10-20')).toEqual([]);
    expect(getDayRoutines([ended], [], '2026-10-19')).toHaveLength(1);
  });
  it('완료는 그날 남긴 목표로 (나중에 목표를 바꿔도 지난 날은 그대로)', () => {
    const raised = {
      ...WATER,
      goal: { kind: 'count', target: 10, unit: '잔' },
    } as const;
    const [item] = getDayRoutines(
      [raised],
      [check(WATER, '2026-10-19', 8, 8)],
      '2026-10-19',
    );
    expect(item).toMatchObject({ count: 8, target: 8, isDone: true });
  });
});

describe('getPerfectDays (그날 루틴을 모두 해낸 날)', () => {
  it('그날 해야 할 루틴을 전부 채운 날만 센다', () => {
    // 10/19(월)~10/21(수): 물은 매일, 스트레칭은 월·수
    const result = getPerfectDays(
      [WATER, STRETCH],
      [
        // 10/19: 물 8잔 + 스트레칭 → 성공
        check(WATER, '2026-10-19', 8),
        check(STRETCH, '2026-10-19', 1),
        // 10/20(화): 스트레칭 없는 날, 물 8잔 → 성공
        check(WATER, '2026-10-20', 8),
        // 10/21: 스트레칭만, 물 3잔 → 실패
        check(WATER, '2026-10-21', 3),
        check(STRETCH, '2026-10-21', 1),
      ],
      { from: '2026-10-19', to: '2026-10-21' },
    );
    expect(result).toEqual({ scheduledDays: 3, perfectDays: 2 });
  });
  it('시작 전 날은 해야 할 날로 세지 않는다', () => {
    const lateStart = { ...WATER, startDate: '2026-10-21' };
    expect(
      getPerfectDays([lateStart], [], { from: '2026-10-19', to: '2026-10-21' }),
    ).toEqual({ scheduledDays: 1, perfectDays: 0 });
  });
  it('루틴이 없으면 해야 할 날도 0 (0일 성공처럼 보이지 않게 부르는 쪽이 — 로)', () => {
    expect(
      getPerfectDays([], [], { from: '2026-10-01', to: '2026-10-21' }),
    ).toEqual({ scheduledDays: 0, perfectDays: 0 });
  });
});
