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

export type PerfectDays = {
  // 루틴이 하나라도 있던 날 수 (시작 전·그만둔 뒤·일정 없는 요일은 뺀다)
  scheduledDays: number;
  // 그중 그날 해야 할 루틴을 모두 채운 날 수
  perfectDays: number;
};

// 기간(양 끝 포함) 중 "루틴을 모두 해낸 날" 수 (2026-10-25 사용자 결정: % 대신 "한 달 중 며칠 성공", 그날 루틴을 전부 해야 하루).
// %는 루틴이 많을수록 하루를 빼먹어도 덜 떨어져 "오늘 다 했나"가 잘 안 보였다. 날짜로 세면 그날 하나라도 빠지면 그날은 실패다.
// 루틴이 없던 날은 세지 않는다(성공도 실패도 아님). 미래 날짜는 부르는 쪽이 기간을 오늘까지로 잘라 넘긴다 (아직 안 온 날을 실패로 세지 않게)
export function getPerfectDays(
  routines: Routine[],
  checks: RoutineCheck[],
  range: DateRange,
): PerfectDays {
  const byKey = indexChecks(checks);
  // 날짜 → 그날 해야 할 루틴을 모두 채웠는지 (한 번이라도 빠지면 false)
  const days = new Map<string, boolean>();
  for (const routine of routines) {
    for (const date of listScheduledDates(
      routine.schedule,
      range.from,
      range.to,
    )) {
      if (!isActiveOn(routine, date)) continue;
      const check = byKey.get(checkKey(routine.id, date));
      const isDone = check ? isCheckDone(check.fields) : false;
      days.set(date, (days.get(date) ?? true) && isDone);
    }
  }
  return {
    scheduledDays: days.size,
    perfectDays: [...days.values()].filter(Boolean).length,
  };
}
