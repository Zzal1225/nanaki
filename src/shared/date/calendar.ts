import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { fromLocalDateString, toLocalDateString } from './toLocalDateString';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAYS_PER_WEEK = 7;

// 한국 달력 관례대로 일요일부터 (시안: 일 월 화 … 토). date-fns 기본값도 0이지만,
// 기본값에 기대면 locale을 바꿀 때 조용히 월요일 시작으로 바뀔 수 있어 매번 적어 준다
const WEEK_OPTIONS = { weekStartsOn: 0 } as const;

// 날짜는 앱 전체에서 'YYYY-MM-DD' 글자로 다닌다 (DB occurred_at, 주소 ?date=).
// date-fns는 Date를 받으므로 계산할 때만 로컬 자정 Date로 바꿨다가 바로 글자로 돌린다.
// 문자열 → Date는 fromLocalDateString만 쓴다: new Date('2026-10-01')은 UTC 자정이라 미국에서는 9월 30일이 된다

function shift(date: string, move: (value: Date) => Date): string {
  return toLocalDateString(move(fromLocalDateString(date)));
}

// 주소 값 검사. 모양만 보면 '2026-02-30'이 통과하므로, Date로 만들었다가 다시 글자로 돌려 같은지 본다
// (Date는 2월 30일을 3월 2일로 넘겨 버려서 왕복하면 글자가 달라진다)
export function isDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  return toLocalDateString(fromLocalDateString(value)) === value;
}

export function addDaysTo(date: string, amount: number): string {
  return shift(date, (value) => addDays(value, amount));
}

// 직접 계산하지 않고 date-fns를 쓰는 이유: 1월 31일 + 1달 = 2월 28일(말일로 맞춤)처럼
// 말일 처리를 알아서 해 준다. Date.setMonth는 3월 3일로 넘어가 버린다
export function addMonthsTo(date: string, amount: number): string {
  return shift(date, (value) => addMonths(value, amount));
}

export function startOfWeekOf(date: string): string {
  return shift(date, (value) => startOfWeek(value, WEEK_OPTIONS));
}

export function endOfWeekOf(date: string): string {
  return shift(date, (value) => endOfWeek(value, WEEK_OPTIONS));
}

// 월 보기 칸: 그 달 1일이 있는 주의 일요일 ~ 말일이 있는 주의 토요일, 주 단위로 나눈 것.
// 달마다 4~6주라 줄 수가 바뀐다 (시안은 5주 예시). 앞뒤 다른 달 날짜도 칸을 채우려고 넣는다
export function getMonthGrid(date: string): string[][] {
  const value = fromLocalDateString(date);
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(value), WEEK_OPTIONS),
    end: endOfWeek(endOfMonth(value), WEEK_OPTIONS),
  }).map(toLocalDateString);

  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += DAYS_PER_WEEK) {
    weeks.push(days.slice(i, i + DAYS_PER_WEEK));
  }
  return weeks;
}
