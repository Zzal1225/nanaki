const DATE_PART_LENGTH = 2;

// Date → 'YYYY-MM-DD' (사용자가 있는 곳의 날짜).
// toISOString()을 쓰지 않는 이유: UTC 기준이라 한국 오전 9시 전에는 하루 전 날짜가 나온다
// (한국 10월 21일 오전 8시 = UTC 10월 20일 23시 → '2026-10-20')
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  // getMonth()는 0부터 센다 (1월 = 0)
  const month = String(date.getMonth() + 1).padStart(DATE_PART_LENGTH, '0');
  const day = String(date.getDate()).padStart(DATE_PART_LENGTH, '0');
  return `${year}-${month}-${day}`;
}
