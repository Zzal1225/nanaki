import {
  addDaysTo,
  addMonthsTo,
  addWeeksTo,
  endOfWeekOf,
  isDateString,
  startOfWeekOf,
} from '@/shared/date/calendar';

export const CALENDAR_VIEWS = ['month', 'week'] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

// 캘린더가 기억하는 것은 이 두 값뿐이다. 보이는 달·주는 date에서 계산한다:
// "몇째 주를 보는지"를 따로 저장하면 date와 어긋날 수 있는 값이 하나 더 생긴다
export type CalendarState = {
  view: CalendarView;
  // 고른 날짜 'YYYY-MM-DD'
  date: string;
};

type CalendarSearchParams = {
  view: string | null;
  date: string | null;
};

const DEFAULT_VIEW: CalendarView = 'month';

function isCalendarView(value: unknown): value is CalendarView {
  return CALENDAR_VIEWS.some((view) => view === value);
}

// 주소(?view=week&date=2026-10-21)는 누구나 고쳐 칠 수 있다.
// 값이 없거나 틀리면(?view=abc, ?date=2026-02-30) 화면을 깨뜨리지 않고 월 보기·오늘로 대신한다.
// 오늘은 밖에서 받는다: 이 함수가 new Date()를 부르면 테스트마다 결과가 달라진다
export function parseCalendarState(
  params: CalendarSearchParams,
  today: string,
): CalendarState {
  return {
    view: isCalendarView(params.view) ? params.view : DEFAULT_VIEW,
    date: isDateString(params.date) ? params.date : today,
  };
}

// 주소는 이 함수 한 곳에서만 만든다. 기본값(월 보기)은 적지 않아 주소가 짧다
export function toCalendarHref(state: CalendarState): string {
  const params = new URLSearchParams();
  if (state.view !== DEFAULT_VIEW) params.set('view', state.view);
  params.set('date', state.date);
  return `/?${params.toString()}`;
}

// 이전·다음 "기간"으로: 월 보기면 한 달, 주 보기면 한 주. 고른 날의 요일·일은 유지한다
// (10월 16일 → 11월 16일). 버튼·키보드(PageUp/PageDown)·나중의 스와이프가 모두 이 함수를 부른다
export function shiftPeriod(
  state: CalendarState,
  delta: number,
): CalendarState {
  const date =
    state.view === 'month'
      ? addMonthsTo(state.date, delta)
      : addWeeksTo(state.date, delta);
  return { ...state, date };
}

const DAYS_PER_WEEK = 7;

// 키보드로 옮길 날짜 (WAI-ARIA 날짜 고르기 grid 패턴). 이 키가 아니면 null → 브라우저 기본 동작을 막지 않는다.
// 달 경계를 넘으면 date가 다음 달이 되어 보이는 달도 따라 바뀐다 (따로 처리할 것이 없다)
export function getKeyboardTarget(
  state: CalendarState,
  key: string,
): string | null {
  switch (key) {
    case 'ArrowLeft':
      return addDaysTo(state.date, -1);
    case 'ArrowRight':
      return addDaysTo(state.date, 1);
    case 'ArrowUp':
      return addDaysTo(state.date, -DAYS_PER_WEEK);
    case 'ArrowDown':
      return addDaysTo(state.date, DAYS_PER_WEEK);
    case 'Home':
      return startOfWeekOf(state.date);
    case 'End':
      return endOfWeekOf(state.date);
    case 'PageUp':
      return shiftPeriod(state, -1).date;
    case 'PageDown':
      return shiftPeriod(state, 1).date;
    default:
      return null;
  }
}
