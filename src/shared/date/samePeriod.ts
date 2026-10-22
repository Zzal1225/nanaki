import { getMonthRangeOf, shiftMonth, toMonthString } from './month';
import type { DateRange } from './monthRange';

// 'YYYY-MM-DD'에서 일(DD)이 시작하는 자리
const DAY_OF_MONTH_START = 'YYYY-MM-'.length;

export type SamePeriod = {
  current: DateRange;
  previous: DateRange;
};

// 지난달과 비교할 "같은 기간" (2026-10-22 사용자 결정: "지난달 같은 기간보다").
// - 이번 달: 1일~오늘 vs 지난달 1일~같은 날. 10월 22일이면 9월 1~22일과 비교해야 공정하다
//   (지난달 전체와 비교하면 달 초에는 늘 "덜 썼어요"가 된다).
//   지난달에 그 날이 없으면 말일까지 (3월 31일 → 2월 28일)
// - 지난 달: 그 달 전체 vs 그 전 달 전체
// - 아직 오지 않은 달: 비교하지 않는다 (null)
export function getSamePeriod(month: string, today: string): SamePeriod | null {
  const currentMonth = toMonthString(today);
  if (month > currentMonth) return null;

  const previousMonth = shiftMonth(month, -1);
  const fullCurrent = getMonthRangeOf(month);
  const fullPrevious = getMonthRangeOf(previousMonth);
  if (month < currentMonth)
    return { current: fullCurrent, previous: fullPrevious };

  const day = Number(today.slice(DAY_OF_MONTH_START));
  const previousLastDay = Number(fullPrevious.to.slice(DAY_OF_MONTH_START));
  const previousDay = String(Math.min(day, previousLastDay)).padStart(2, '0');
  return {
    current: { from: fullCurrent.from, to: today },
    previous: {
      from: fullPrevious.from,
      to: `${previousMonth}-${previousDay}`,
    },
  };
}

// 기간 안(양 끝 포함)의 것만. 'YYYY-MM-DD'는 글자 순서 = 날짜 순서라 그대로 비교한다
export function filterInRange<T extends { occurredAt: string }>(
  entries: T[],
  range: DateRange,
): T[] {
  return entries.filter(
    (entry) => entry.occurredAt >= range.from && entry.occurredAt <= range.to,
  );
}
