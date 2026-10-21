import { useSearchParams } from 'next/navigation';
import { useToday } from '@/shared/date/useToday';
import { parseCalendarDate, shiftMonth, toCalendarHref } from './calendarState';

export type CalendarControls = {
  // 고른 날짜 'YYYY-MM-DD'
  date: string;
  today: string;
  selectDate: (date: string) => void;
  // 이전(-1)·다음(+1) 달. 버튼, PageUp/PageDown, 나중에 붙일 스와이프가 모두 이것만 부른다
  shiftMonth: (delta: number) => void;
  goToday: () => void;
};

// router.replace 대신 history.replaceState를 쓰는 이유:
// - replace(push 아님): 달을 열 번 넘긴 뒤 뒤로 가기를 열 번 눌러야 앱을 나가는 일이 없다
// - router 대신 history: router.replace는 searchParams가 바뀐 페이지를 서버에 다시 요청한다.
//   방향키를 누를 때마다 서버를 다녀오면 느리다. Next.js는 history.replaceState도 지켜보고 있어서
//   useSearchParams가 바로 새 값을 준다 (서버 요청 없음)
function replaceCalendarUrl(date: string): void {
  window.history.replaceState(null, '', toCalendarHref(date));
}

// 캘린더의 상태(주소의 날짜)와 그 상태를 바꾸는 방법을 한곳에 모은다.
// 오늘을 모르는 동안(서버·첫 하이드레이션)은 null → 화면은 자리만 보여 준다
export function useCalendar(): CalendarControls | null {
  const searchParams = useSearchParams();
  const today = useToday();
  if (!today) return null;

  const date = parseCalendarDate(searchParams.get('date'), today);

  return {
    date,
    today,
    selectDate: replaceCalendarUrl,
    shiftMonth: (delta) => replaceCalendarUrl(shiftMonth(date, delta)),
    goToday: () => replaceCalendarUrl(today),
  };
}
