const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const DATE_STRING_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

type DateParts = { year: string; month: string; day: string; weekday: string };

// new Date('2026-10-16')으로 읽지 않는 이유: 그 형식은 UTC 자정으로 읽혀서
// 미국 등 UTC보다 늦은 시간대에서는 하루 전 요일이 나온다. 숫자를 꺼내 로컬 날짜로 만든다
function parseDateString(dateString: string): DateParts | null {
  const match = DATE_STRING_PATTERN.exec(dateString);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return { year, month, day, weekday: WEEKDAYS[date.getDay()] };
}

// 'YYYY-MM-DD' → '2026. 10. 16 (금)' (작성 폼·상세의 날짜 칸)
export function formatDisplayDate(dateString: string): string {
  const parts = parseDateString(dateString);
  if (!parts) return '';
  return `${parts.year}. ${parts.month}. ${parts.day} (${parts.weekday})`;
}

// 'YYYY-MM-DD' → '10.16 (금)' (목록처럼 좁은 자리. 시안 기록 탭)
export function formatShortDate(dateString: string): string {
  const parts = parseDateString(dateString);
  if (!parts) return '';
  return `${parts.month}.${parts.day} (${parts.weekday})`;
}

// 'YYYY-MM-DD' → '10월 16일 (금)' (홈 하루 요약 머리). 앞자리 0은 뺀다: 말로 읽는 모양이라 '10월 06일'은 어색하다
export function formatMonthDayLabel(dateString: string): string {
  const parts = parseDateString(dateString);
  if (!parts) return '';
  return `${Number(parts.month)}월 ${Number(parts.day)}일 (${parts.weekday})`;
}
