import { toLocalDateString } from './toLocalDateString';

export type DateRange = {
  // 'YYYY-MM-DD', 둘 다 포함
  from: string;
  to: string;
};

// 주어진 날짜가 속한 달의 첫날~말일 (로컬 기준).
// 말일은 "다음 달 0일" = 이번 달 마지막 날로 구한다. 28·29·30·31일을 따로 따지지 않아도 된다
export function getMonthRange(date: Date): DateRange {
  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    from: toLocalDateString(new Date(year, month, 1)),
    to: toLocalDateString(new Date(year, month + 1, 0)),
  };
}
