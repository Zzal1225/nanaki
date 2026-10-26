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

// 알림 시각 (35a): 한국 시각 'HH:MM', 10분 단위만 (2026-10-23 사용자 결정, DB check와 같은 규칙).
// 보내는 작업이 10분마다 돌아서 그 사이 시각은 언제 울릴지 애매하다. 분의 끝자리가 0인지를 정규식으로 본다
export const REMIND_MINUTE_STEP = 10;
// 새 루틴·알림을 켤 때 처음 고르는 시각 (아침에 하루 루틴을 떠올리게)
export const DEFAULT_REMIND_AT = '09:00';
export const remindAtSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]0$/, { error: '10분 단위로 골라 주세요' })
  .nullable();

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
  // 알림 시각. null = 알림 없음. 알림은 이 기기가 아니라 구독한 모든 기기로 간다 (push_subscriptions)
  remindAt: remindAtSchema,
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

// 알림 시각 선택지: 00:00부터 23:50까지 10분마다 (144개). 폼의 고르기 칸이 쓴다
export function listRemindTimes(): string[] {
  const times: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += REMIND_MINUTE_STEP) {
    const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
    const minute = String(minutes % 60).padStart(2, '0');
    times.push(`${hour}:${minute}`);
  }
  return times;
}

// '21:30' → '오후 9:30' (한국어 앱의 시각 표기). 자정은 '오전 12:00', 정오는 '오후 12:00'
export function formatRemindTime(remindAt: string): string {
  const [hour, minute] = remindAt.split(':').map(Number);
  const period = hour < 12 ? '오전' : '오후';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${hour12}:${String(minute).padStart(2, '0')}`;
}
