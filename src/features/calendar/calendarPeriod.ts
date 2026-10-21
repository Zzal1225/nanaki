import {
  endOfWeekOf,
  getMonthGrid,
  getWeekDays,
  startOfWeekOf,
} from '@/shared/date/calendar';
import {
  formatYearMonthLabel,
  getMonthRangeOf,
  toMonthString,
} from '@/shared/date/month';
import type { DateRange } from '@/shared/date/monthRange';
import type { CalendarState } from './calendarState';

// 월 보기와 주 보기가 다른 점은 이 파일에만 둔다: 보이는 칸, 불러올 기간, 제목, 흐린 칸.
// 화면(CalendarGrid·HomeCalendar)은 이 함수들만 불러서 view마다 if를 흩뿌리지 않는다.
// 모두 state(view + date)만 받는 순수 함수라 "몇째 주"를 따로 들고 다닐 필요가 없다

// 그려질 칸을 주 단위로. 월 보기는 4~6주, 주 보기는 한 주
export function getVisibleWeeks(state: CalendarState): string[][] {
  return state.view === 'month'
    ? getMonthGrid(state.date)
    : [getWeekDays(state.date)];
}

// 기록을 불러올 기간. 월 보기는 그 달만(앞뒤 다른 달 칸은 점을 그리지 않으므로),
// 주 보기는 달이 걸쳐도 그 주 7일 전부 (9월 27일~10월 3일)
export function getVisibleRange(state: CalendarState): DateRange {
  return state.view === 'month'
    ? getMonthRangeOf(toMonthString(state.date))
    : { from: startOfWeekOf(state.date), to: endOfWeekOf(state.date) };
}

// 보이는 기간 밖의 칸 = 흐린 숫자·점 없음. 월 보기의 앞뒤 다른 달 날짜만 해당한다.
// 주 보기는 7칸 모두 불러온 기간 안이라 흐리게 하지 않는다
export function isOutsidePeriod(state: CalendarState, date: string): boolean {
  return (
    state.view === 'month' && toMonthString(date) !== toMonthString(state.date)
  );
}

type DateNumbers = { year: number; month: number; day: number };

function toNumbers(date: string): DateNumbers {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

// 머리 제목. 월: '2026년 10월'. 주: '10월 18–24일' (시안), 달이 걸치면 '9월 27일–10월 3일',
// 해가 걸치면 양쪽에 연도 ('2026년 12월 27일–2027년 1월 2일': 연도 없이 '12월 27일–1월 2일'이면 어느 해인지 모른다)
export function formatPeriodTitle(state: CalendarState): string {
  if (state.view === 'month') {
    return formatYearMonthLabel(toMonthString(state.date));
  }

  const start = toNumbers(startOfWeekOf(state.date));
  const end = toNumbers(endOfWeekOf(state.date));
  // 범위는 붙임표(-)가 아니라 en dash(–). 한국어 문서에서도 기간 표기에 쓰는 기호다 (시안)
  if (start.year !== end.year) {
    return `${start.year}년 ${start.month}월 ${start.day}일–${end.year}년 ${end.month}월 ${end.day}일`;
  }
  if (start.month !== end.month) {
    return `${start.month}월 ${start.day}일–${end.month}월 ${end.day}일`;
  }
  return `${start.month}월 ${start.day}–${end.day}일`;
}
