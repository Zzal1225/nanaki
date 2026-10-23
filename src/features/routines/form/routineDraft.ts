import { z } from 'zod';
import { scheduleSchema, type Schedule } from '@/shared/schedule/schedule';
import {
  DEFAULT_COUNT_UNIT,
  goalSchema,
  routineSchema,
  type Goal,
} from '../schema/routine';

// 폼이 입력 중에 들고 있는 반복·목표 (draft).
// 저장 모양(Schedule·Goal)은 종류마다 칸이 달라서(weekly는 days, monthly는 day), 그대로 들고 있으면
// "매달"을 눌렀다가 "요일 선택"으로 돌아올 때 골라 둔 요일이 사라진다. 그래서 두 종류의 칸을 모두 들고 있다가
// 저장할 때만 고른 종류의 칸으로 줄인다
export type ScheduleDraft = {
  kind: Schedule['kind'];
  days: number[];
  // 빈 칸이면 undefined (0으로 바꾸면 "입력 안 함"이 "0일"로 보인다)
  day: number | undefined;
};

export type GoalDraft = {
  kind: Goal['kind'];
  // target이 아니라 targetCount: React Hook Form의 onChange는 받은 값에 target 속성이 있으면
  // 입력 이벤트로 보고 value.target.value를 꺼낸다(getEventValue). 그러면 횟수를 입력하는 순간 목표 값 전체가 망가진다
  targetCount: number | undefined;
  unit: string;
};

// 새 루틴 기본값: 매일 + 체크 (가장 흔한 루틴). 매달을 누르면 시작일의 날짜가 미리 들어간다
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

export function scheduleToDraft(
  schedule: Schedule | undefined,
  startDate: string,
): ScheduleDraft {
  const startDay = Number(startDate.slice('YYYY-MM-'.length));
  if (!schedule) return { kind: 'weekly', days: EVERY_DAY, day: startDay };
  return schedule.kind === 'weekly'
    ? { kind: 'weekly', days: schedule.days, day: startDay }
    : { kind: 'monthly', days: EVERY_DAY, day: schedule.day };
}

export function goalToDraft(goal: Goal | undefined): GoalDraft {
  if (!goal || goal.kind === 'check')
    return { kind: 'check', targetCount: undefined, unit: '' };
  return { kind: 'count', targetCount: goal.target, unit: goal.unit };
}

function toScheduleCandidate(draft: ScheduleDraft) {
  return draft.kind === 'weekly'
    ? { kind: draft.kind, days: draft.days }
    : { kind: draft.kind, day: draft.day };
}

// 단위를 비우면 기본 단위로 저장한다: 화면마다 "단위가 없으면…"을 다시 따지지 않게
function toGoalCandidate(draft: GoalDraft) {
  return draft.kind === 'check'
    ? { kind: draft.kind }
    : {
        kind: draft.kind,
        target: draft.targetCount,
        unit: draft.unit.trim() || DEFAULT_COUNT_UNIT,
      };
}

// 폼 검증: draft → 저장 모양으로 바꾼 뒤(transform) 진짜 스키마로 검사한다(pipe).
// 오류 경로는 schedule.days / goal.target처럼 그대로 남아 칸마다 문구를 붙일 수 있다
export const routineDraftSchema = z.object({
  name: routineSchema.shape.name,
  startDate: routineSchema.shape.startDate,
  schedule: z
    .custom<ScheduleDraft>()
    .transform(toScheduleCandidate)
    .pipe(scheduleSchema),
  goal: z.custom<GoalDraft>().transform(toGoalCandidate).pipe(goalSchema),
  remindAt: routineSchema.shape.remindAt,
});
export type RoutineDraftInput = z.input<typeof routineDraftSchema>;
