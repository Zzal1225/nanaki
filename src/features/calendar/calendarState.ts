import {
  addDaysTo,
  addMonthsTo,
  endOfWeekOf,
  isDateString,
  startOfWeekOf,
} from '@/shared/date/calendar';

// 캘린더가 기억하는 것은 고른 날짜 하나('YYYY-MM-DD')뿐이다. 보이는 달은 이 날짜에서 계산한다:
// "몇 월을 보는지"를 따로 저장하면 날짜와 어긋날 수 있는 값이 하나 더 생긴다.
// 주 보기(?view=week)는 2026-10-21에 뺐다 (private/decisions/2026-10-21-remove-week-view.md).
// 예전 주소에 view가 남아 있어도 읽지 않으므로 월 보기로 열린다

// 주소(?date=2026-10-21)는 누구나 고쳐 칠 수 있다. 값이 없거나 틀리면(?date=2026-02-30) 오늘로 대신한다.
// 오늘은 밖에서 받는다: 이 함수가 new Date()를 부르면 테스트마다 결과가 달라진다
export function parseCalendarDate(value: string | null, today: string): string {
  return isDateString(value) ? value : today;
}

// 주소는 이 함수 한 곳에서만 만든다
export function toCalendarHref(date: string): string {
  return `/?${new URLSearchParams({ date }).toString()}`;
}

// 이전·다음 달로. 고른 일은 유지하고, 없는 날은 그 달 말일로 맞춘다 (1월 31일 → 2월 28일).
// 버튼(‹ ›)·키보드(PageUp/PageDown)·나중의 스와이프(Issue #32)가 모두 이 함수를 부른다
export function shiftMonth(date: string, delta: number): string {
  return addMonthsTo(date, delta);
}

const DAYS_PER_WEEK = 7;

// 키보드로 옮길 날짜 (WAI-ARIA 날짜 고르기 grid 패턴). 이 키가 아니면 null → 브라우저 기본 동작을 막지 않는다.
// 달 경계를 넘으면 날짜가 다음 달이 되어 보이는 달도 따라 바뀐다 (따로 처리할 것이 없다)
export function getKeyboardTarget(date: string, key: string): string | null {
  switch (key) {
    case 'ArrowLeft':
      return addDaysTo(date, -1);
    case 'ArrowRight':
      return addDaysTo(date, 1);
    case 'ArrowUp':
      return addDaysTo(date, -DAYS_PER_WEEK);
    case 'ArrowDown':
      return addDaysTo(date, DAYS_PER_WEEK);
    case 'Home':
      return startOfWeekOf(date);
    case 'End':
      return endOfWeekOf(date);
    case 'PageUp':
      return shiftMonth(date, -1);
    case 'PageDown':
      return shiftMonth(date, 1);
    default:
      return null;
  }
}
