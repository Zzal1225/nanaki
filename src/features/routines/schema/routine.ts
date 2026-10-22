import { z } from 'zod';
import {
  maxLengthMessage,
  requiredInputMessage,
} from '@/features/records/schema/fieldKinds';
import { scheduleSchema } from '@/shared/schedule/schedule';

// 루틴 = 반복 규칙(언제) + 목표(얼마나). 수행 결과는 기록(records, type = 'routine')에 따로 남는다 (CLAUDE.md 원칙).
// DB 칸(routines 테이블)의 check 제약과 같은 값을 쓴다

// DB check (char_length(name) between 1 and 40)와 같은 값
export const MAX_ROUTINE_NAME_LENGTH = 40;
// 횟수형 목표. 1이면 체크형과 같아서 2부터. 하루에 99번 넘게 세는 루틴은 오타로 본다
export const MIN_COUNT_TARGET = 2;
export const MAX_COUNT_TARGET = 99;
// "잔", "쪽", "번" 같은 짧은 단위
export const MAX_COUNT_UNIT_LENGTH = 6;
// 단위를 비우면 쓰는 말 ("하루 8회")
export const DEFAULT_COUNT_UNIT = '회';

// 목표 (시안 "체크 / 횟수"): 체크형은 한 번 누르면 완료, 횟수형은 하루 target번 채우면 완료
export const goalSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('check') }),
  z.object({
    kind: z.literal('count'),
    target: z
      .int({ error: requiredInputMessage('횟수') })
      .min(MIN_COUNT_TARGET, {
        error: `${MIN_COUNT_TARGET}번 이상이어야 해요 (한 번이면 체크를 골라 주세요)`,
      })
      .max(MAX_COUNT_TARGET, {
        error: `${MAX_COUNT_TARGET}번까지 입력할 수 있어요`,
      }),
    unit: z
      .string()
      .trim()
      .max(MAX_COUNT_UNIT_LENGTH, {
        error: maxLengthMessage(MAX_COUNT_UNIT_LENGTH),
      }),
  }),
]);
export type Goal = z.infer<typeof goalSchema>;

export const routineSchema = z.object({
  id: z.uuid(),
  name: z
    .string()
    .trim()
    .min(1, { error: requiredInputMessage('이름') })
    .max(MAX_ROUTINE_NAME_LENGTH, {
      error: maxLengthMessage(MAX_ROUTINE_NAME_LENGTH),
    }),
  // 기록의 occurredAt과 같이 로컬 'YYYY-MM-DD' 문자열 그대로
  startDate: z.iso.date({
    error: (issue) =>
      issue.input === '' ? '시작일을 골라 주세요' : '날짜 형식이 아니에요',
  }),
  schedule: scheduleSchema,
  goal: goalSchema,
  // 그만둔 날. 이 날부터 일정이 없다. null = 진행 중
  endedOn: z.iso.date().nullable(),
});
export type Routine = z.infer<typeof routineSchema>;

// 만들기·고치기 폼: id는 저장할 때 붙이고, 그만두기는 폼이 아니라 따로 하는 동작이라 뺀다
export const routineFormSchema = routineSchema.omit({
  id: true,
  endedOn: true,
});
export type RoutineFormValues = z.output<typeof routineFormSchema>;

// date에 이 루틴을 해야 하는가: 시작일 이후이고, 그만두지 않았거나 그만둔 날 전
export function isActiveOn(routine: Routine, date: string): boolean {
  return (
    routine.startDate <= date &&
    (routine.endedOn === null || date < routine.endedOn)
  );
}

// 화면 글자: "하루 8잔", "체크"
export function formatGoal(goal: Goal): string {
  if (goal.kind === 'check') return '체크';
  return `하루 ${goal.target}${goal.unit || DEFAULT_COUNT_UNIT}`;
}

// 그만두기를 누른 날(today)을 그만둔 날로. 아직 시작 전인 루틴은 시작일로 맞춘다:
// DB가 "그만둔 날 >= 시작일"을 검사하고, 시작일 = 그만둔 날이면 일정이 하루도 없는 루틴이 된다
export function toEndedOn(routine: Routine, today: string): string {
  return today < routine.startDate ? routine.startDate : today;
}
