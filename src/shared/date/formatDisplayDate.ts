const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const DATE_STRING_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// 'YYYY-MM-DD' → '2026. 10. 16 (금)' (시안의 날짜 칸 표시)
// new Date('2026-10-16')으로 읽지 않는 이유: 그 형식은 UTC 자정으로 읽혀서
// 미국 등 UTC보다 늦은 시간대에서는 하루 전 요일이 나온다. 숫자를 꺼내 로컬 날짜로 만든다
export function formatDisplayDate(dateString: string): string {
  const match = DATE_STRING_PATTERN.exec(dateString);
  if (!match) return '';

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return `${year}. ${month}. ${day} (${WEEKDAYS[date.getDay()]})`;
}
