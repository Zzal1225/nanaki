import { getMonthRange, type DateRange } from './monthRange';

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const MONTHS_PER_YEAR = 12;
const MONTH_STRING_LENGTH = 'YYYY-MM'.length;

// 'YYYY-MM' 한 가지 모양으로 "달"을 다룬다. 주소(?month=2026-10)에 그대로 쓰여서 새로고침·공유에도 같은 달이 열린다

// 'YYYY-MM-DD' → 'YYYY-MM'
export function toMonthString(dateString: string): string {
  return dateString.slice(0, MONTH_STRING_LENGTH);
}

// 주소 값은 누구나 고쳐 칠 수 있다. 모양이 틀리거나 13월 같은 값이면 null → 부르는 쪽이 이번 달로 대신한다
export function parseMonthParam(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = MONTH_PATTERN.exec(value);
  if (!match) return null;
  const month = Number(match[2]);
  return month >= 1 && month <= MONTHS_PER_YEAR ? value : null;
}

// '2026-01', -1 → '2025-12'. Date 대신 숫자로 계산해 시간대·말일 문제를 아예 피한다
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const index = year * MONTHS_PER_YEAR + (monthNumber - 1) + delta;
  const nextYear = Math.floor(index / MONTHS_PER_YEAR);
  const nextMonth = (index % MONTHS_PER_YEAR) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

// 'YYYY-MM' → 그 달의 첫날~말일
export function getMonthRangeOf(month: string): DateRange {
  const [year, monthNumber] = month.split('-').map(Number);
  return getMonthRange(new Date(year, monthNumber - 1, 1));
}

// '2026-10' → '10월'. 올해가 아니면 연도까지 ('2025년 12월')
export function formatMonthLabel(month: string, currentMonth: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const [currentYear] = currentMonth.split('-').map(Number);
  return year === currentYear
    ? `${monthNumber}월`
    : `${year}년 ${monthNumber}월`;
}
