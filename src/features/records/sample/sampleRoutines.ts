import type { Routine } from '@/features/routines/schema/routine';
import { addDaysTo } from '@/shared/date/calendar';
import { isScheduledOn } from '@/shared/schedule/schedule';
import type { NewRecordInput } from '../api/recordStore';

// 체험하기 예시 루틴과 최근 일주일의 체크.
// - 시작일을 6일 전으로: 홈 하루 요약에 "오늘 할 루틴"이 보이고, 기록 탭 카드에 달성률이 나온다.
//   한 달 전부터 시작하면 체크를 한 달 치(수십 줄) 넣어야 달성률이 그럴듯해지는데, 그러면 최근 기록이 체크로 덮인다
// - 오늘 물 마시기는 3/8잔(진행 중): 체험하는 사람이 바로 + 를 눌러 볼 수 있게
// - id는 부르는 쪽이 넘긴다: routines.id는 전체 사용자에 걸친 기본 키라 체험 계정마다 새로 만들어야 한다
const START_DAYS_AGO = 6;
const WATER_TARGET = 8;
// 오늘부터 며칠 전까지 물 마시기 잔 수 (0 = 오늘). 하루는 6잔으로 목표를 못 채운 날
const WATER_COUNTS = [3, 8, 8, 6, 8, 8, 8];

export type SampleRoutineIds = { water: string; stretch: string };

export function buildSampleRoutines(
  today: string,
  ids: SampleRoutineIds,
): { routines: Routine[]; checks: NewRecordInput[] } {
  const startDate = addDaysTo(today, -START_DAYS_AGO);
  const water: Routine = {
    id: ids.water,
    name: '물 마시기',
    startDate,
    schedule: { kind: 'weekly', days: [0, 1, 2, 3, 4, 5, 6] },
    goal: { kind: 'count', target: WATER_TARGET, unit: '잔' },
    endedOn: null,
  };
  const stretch: Routine = {
    id: ids.stretch,
    name: '스트레칭',
    startDate,
    schedule: { kind: 'weekly', days: [1, 3, 5] },
    goal: { kind: 'check' },
    endedOn: null,
  };

  function check(
    routine: Routine,
    daysAgo: number,
    count: number,
    target: number,
    unit: string,
  ): NewRecordInput {
    return {
      type: 'routine',
      occurredAt: addDaysTo(today, -daysAgo),
      title: routine.name,
      memo: null,
      tags: [],
      fields: { routineId: routine.id, count, target, unit },
    };
  }

  const waterChecks = WATER_COUNTS.map((count, daysAgo) =>
    check(water, daysAgo, count, WATER_TARGET, '잔'),
  );
  // 스트레칭: 지난 일정 날 중 가장 최근 하루만 빼고 했다 (오늘은 아직 안 함)
  const stretchDays = Array.from({ length: START_DAYS_AGO }, (_, i) => i + 1)
    .filter((daysAgo) =>
      isScheduledOn(stretch.schedule, addDaysTo(today, -daysAgo)),
    )
    .slice(1);
  const stretchChecks = stretchDays.map((daysAgo) =>
    check(stretch, daysAgo, 1, 1, ''),
  );

  return {
    routines: [water, stretch],
    checks: [...waterChecks, ...stretchChecks],
  };
}
