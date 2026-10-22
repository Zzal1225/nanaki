import { eachDayOfInterval, getDaysInMonth } from 'date-fns';
import { z } from 'zod';
import {
  fromLocalDateString,
  toLocalDateString,
} from '../date/toLocalDateString';

// 공통 반복 규칙 (CLAUDE.md: 루틴·고정지출·체형 측정 주기가 같은 구조를 쓴다).
// 규칙은 기록이 아니다: "언제 해야 하는가"만 계산하고, 실제로 했는지는 records가 담는다.
// DB에는 jsonb로 저장되고(routines.schedule), 모양 검사는 여기 Zod 스키마가 맡는다

// Date.getDay()와 같은 번호: 0 = 일요일 … 6 = 토요일 (캘린더도 일요일부터)
export const WEEKDAY_LABELS = [
  '일',
  '월',
  '화',
  '수',
  '목',
  '금',
  '토',
] as const;
const LAST_WEEKDAY = WEEKDAY_LABELS.length - 1;
export const MAX_DAY_OF_MONTH = 31;

export const scheduleSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('weekly'),
    days: z
      .array(z.int().min(0).max(LAST_WEEKDAY))
      .min(1, { error: '요일을 하나 이상 골라 주세요' })
      // 같은 요일이 두 번 들어오면 일정 계산은 맞아도 "주 n회" 같은 표시가 틀린다
      .refine((days) => new Set(days).size === days.length, {
        error: '같은 요일이 두 번 들어 있어요',
      }),
  }),
  z.object({
    kind: z.literal('monthly'),
    // 29~31도 받는다. 그 날이 없는 달은 말일로 맞춘다 (isScheduledOn)
    day: z
      .int({ error: '날짜를 입력해 주세요' })
      .min(1, { error: '1일부터 입력할 수 있어요' })
      .max(MAX_DAY_OF_MONTH, {
        error: `${MAX_DAY_OF_MONTH}일까지 입력할 수 있어요`,
      }),
  }),
]);
export type Schedule = z.infer<typeof scheduleSchema>;

// date('YYYY-MM-DD')가 이 규칙의 날인가.
// 매달 31일 규칙은 30일까지 있는 달에는 30일, 2월에는 28일(윤년 29일)에 돌아온다 ("31일이 없는 달은 말일", 시안).
// 건너뛰지 않고 말일로 당기는 이유: 월세·구독료처럼 "매달 말일 근처"에 꼭 한 번 있어야 하는 일이 사라지지 않게
export function isScheduledOn(schedule: Schedule, date: string): boolean {
  const value = fromLocalDateString(date);
  switch (schedule.kind) {
    case 'weekly':
      return schedule.days.includes(value.getDay());
    case 'monthly':
      return value.getDate() === Math.min(schedule.day, getDaysInMonth(value));
    default: {
      // 새 kind를 추가하고 여기를 빠뜨리면 타입 오류
      const unhandled: never = schedule;
      throw new Error(`처리하지 않은 반복 종류: ${JSON.stringify(unhandled)}`);
    }
  }
}

// from~to(둘 다 포함) 중 규칙에 맞는 날짜들. 달성률(해야 했던 날 수)과 체크 목록이 쓴다
export function listScheduledDates(
  schedule: Schedule,
  from: string,
  to: string,
): string[] {
  if (from > to) return [];
  return eachDayOfInterval({
    start: fromLocalDateString(from),
    end: fromLocalDateString(to),
  })
    .map(toLocalDateString)
    .filter((date) => isScheduledOn(schedule, date));
}

// 화면 글자: "월·수·금", "매일", "매달 15일"
export function formatSchedule(schedule: Schedule): string {
  if (schedule.kind === 'monthly') return `매달 ${schedule.day}일`;
  if (schedule.days.length === WEEKDAY_LABELS.length) return '매일';
  return [...schedule.days]
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_LABELS[day])
    .join('·');
}
