import type { RecordEntryOf } from '@/features/records/schema/recordEntry';
import { isCheckDone } from '@/features/records/schema/routineCheck';
import type { DateRange } from '@/shared/date/monthRange';
import { isScheduledOn, listScheduledDates } from '@/shared/schedule/schedule';
import { isActiveOn, type Routine } from './schema/routine';

type RoutineCheck = RecordEntryOf<'routine'>;

// 목표 횟수: 체크형은 1
export function targetOf(routine: Routine): number {
  return routine.goal.kind === 'check' ? 1 : routine.goal.target;
}

export function unitOf(routine: Routine): string {
  return routine.goal.kind === 'check' ? '' : routine.goal.unit;
}

export type DayRoutine = {
  routine: Routine;
  // 그날 한 횟수 (체크가 없으면 0)
  count: number;
  target: number;
  isDone: boolean;
};

// "루틴 id + 날짜"로 체크를 찾는 열쇠. 하루에 한 줄이라(DB 고유 색인) 겹치지 않는다
function checkKey(routineId: string, date: string): string {
  return `${routineId}|${date}`;
}

function indexChecks(checks: RoutineCheck[]): Map<string, RoutineCheck> {
  return new Map(
    checks.map((check) => [
      checkKey(check.fields.routineId, check.occurredAt),
      check,
    ]),
  );
}

// date에 해야 할 루틴과 그날의 체크 (홈 하루 요약의 루틴 줄, 루틴 상세의 "오늘").
// 그 날 진행 중이고(시작일 이후, 그만두기 전) 반복 규칙에 맞는 루틴만. 루틴 목록 순서(만든 순서) 그대로
export function getDayRoutines(
  routines: Routine[],
  checks: RoutineCheck[],
  date: string,
): DayRoutine[] {
  const byKey = indexChecks(checks);
  return routines
    .filter(
      (routine) =>
        isActiveOn(routine, date) && isScheduledOn(routine.schedule, date),
    )
    .map((routine) => {
      const check = byKey.get(checkKey(routine.id, date));
      const target = check?.fields.target ?? targetOf(routine);
      const count = check?.fields.count ?? 0;
      // 체크가 있으면 그날 남긴 목표로 판단한다 (목표를 나중에 바꿔도 지난 날은 그대로)
      return {
        routine,
        count,
        target,
        isDone: check ? isCheckDone(check.fields) : false,
      };
    });
}

export type Achievement = {
  // 해야 했던 (루틴, 날) 수
  scheduled: number;
  // 그중 목표를 채운 수
  done: number;
  // 반올림한 % (0~100). 해야 할 날이 없으면 null (0%처럼 보이지 않게)
  rate: number | null;
};

const PERCENT = 100;

// 기간(양 끝 포함) 달성률 = 목표를 채운 (루틴, 날) / 해야 했던 (루틴, 날).
// 루틴마다 그 기간의 일정 날짜를 세되, 시작 전·그만둔 뒤는 뺀다.
// 미래 날짜는 부르는 쪽이 기간을 오늘까지로 잘라 넘긴다 (아직 안 온 날을 "안 함"으로 세지 않게)
export function getAchievement(
  routines: Routine[],
  checks: RoutineCheck[],
  range: DateRange,
): Achievement {
  const byKey = indexChecks(checks);
  let scheduled = 0;
  let done = 0;
  for (const routine of routines) {
    for (const date of listScheduledDates(
      routine.schedule,
      range.from,
      range.to,
    )) {
      if (!isActiveOn(routine, date)) continue;
      scheduled += 1;
      const check = byKey.get(checkKey(routine.id, date));
      if (check && isCheckDone(check.fields)) done += 1;
    }
  }
  return {
    scheduled,
    done,
    rate: scheduled === 0 ? null : Math.round((done / scheduled) * PERCENT),
  };
}
