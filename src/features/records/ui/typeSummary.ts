import { getMonthGrid } from '@/shared/date/calendar';
import {
  getMonthRangeOf,
  shiftMonth,
  toMonthString,
} from '@/shared/date/month';
import type { DateRange } from '@/shared/date/monthRange';
import { listBodyMeasurements } from '../schema/body';
import type { RecordEntryOf } from '../schema/recordEntry';
import { REVIEW_TARGET_KINDS } from '../schema/review';

const PERCENT = 100;
// 'YYYY-MM-DD'에서 일(DD)이 시작하는 자리
const DAY_OF_MONTH_START = 'YYYY-MM-'.length;

export type CategoryShare = {
  name: string;
  amount: number;
  // 전체 지출에서 차지하는 비율 (반올림한 정수 %)
  percent: number;
};

export type ExpenseSummary = {
  total: number;
  // 금액이 큰 분류부터. 직접 입력한 분류도 그대로 한 줄이 된다
  categories: CategoryShare[];
};

// 타입 상세 가계부 요약: 이번 달 지출 합계 + 분류별 비율 (시안: 식비 38% -156,700원)
export function summarizeExpenses(
  entries: RecordEntryOf<'expense'>[],
): ExpenseSummary {
  const total = entries.reduce((sum, entry) => sum + entry.fields.amount, 0);
  // 같은 분류끼리 더한다. Map은 넣은 순서를 지키지만, 아래에서 금액순으로 다시 정렬한다
  const byCategory = new Map<string, number>();
  for (const entry of entries) {
    const { category, amount } = entry.fields;
    byCategory.set(category, (byCategory.get(category) ?? 0) + amount);
  }

  const categories = [...byCategory]
    .map(([name, amount]) => ({
      name,
      amount,
      // 합계가 0이면 나누지 않는다 (지출 0원인 달)
      percent: total === 0 ? 0 : Math.round((amount / total) * PERCENT),
    }))
    .sort((a, b) => b.amount - a.amount);

  return { total, categories };
}

export type ReviewSummary = {
  count: number;
  // 고정 선택지 4개를 모두, 0개인 종류도 (시안: 경험 0)
  kinds: { name: string; count: number }[];
};

// 타입 상세 후기 요약: 개수 + 대상 종류별 개수.
// 평균 별점은 넣지 않는다 (2026-10-22 사용자 결정): 대상이 장소·제품·콘텐츠로 제각각이라 한데 모은 평균은 뜻이 약하다
export function summarizeReviews(
  entries: RecordEntryOf<'review'>[],
): ReviewSummary {
  const count = entries.length;

  const kinds = REVIEW_TARGET_KINDS.map((name) => ({
    name,
    count: entries.filter((entry) => entry.fields.targetKind === name).length,
  }));

  return { count, kinds };
}

export type WeekMinutes = {
  // 그 달 안에서 이 주의 첫날·마지막 날 (일). 1주는 1일부터, 마지막 주는 말일까지라 7일이 안 될 수 있다
  firstDay: number;
  lastDay: number;
  minutes: number;
};

export type WorkoutSummary = {
  count: number;
  totalMinutes: number;
  // 캘린더와 같은 일요일 시작 주. 달마다 4~6주
  weeks: WeekMinutes[];
};

// 타입 상세 운동 요약: 이번 달 횟수 + 총 시간 + 주별 시간 (시안 "운동 · 주별 시간", 2026-10-21 사용자 결정: 달 단위).
// 주는 홈 캘린더의 줄과 같게 나눈다(getMonthGrid). "1~7일 / 8~14일"로 자르면 캘린더에서 본 주와 어긋난다
export function summarizeWorkouts(
  entries: RecordEntryOf<'workout'>[],
  month: string,
): WorkoutSummary {
  const minutesByDate = new Map<string, number>();
  for (const entry of entries) {
    const { occurredAt } = entry;
    minutesByDate.set(
      occurredAt,
      (minutesByDate.get(occurredAt) ?? 0) + entry.fields.minutes,
    );
  }

  const weeks = getMonthGrid(`${month}-01`).map((week) => {
    // 캘린더 줄에는 앞뒤 달 날짜도 있다. 이 달 날짜만 남긴다
    const days = week.filter((date) => date.startsWith(month));
    return {
      firstDay: Number(days[0].slice(DAY_OF_MONTH_START)),
      lastDay: Number(days[days.length - 1].slice(DAY_OF_MONTH_START)),
      minutes: days.reduce(
        (sum, date) => sum + (minutesByDate.get(date) ?? 0),
        0,
      ),
    };
  });

  return {
    count: entries.length,
    totalMinutes: entries.reduce((sum, entry) => sum + entry.fields.minutes, 0),
    weeks,
  };
}

export type WeightPoint = {
  // 그 달의 몇 일 (그래프 가로 위치)
  day: number;
  weight: number;
};

export type BodySummary = {
  // 그 달 마지막 기록의 체중. 기록이 없으면 null
  latestWeight: number | null;
  // 그 달 첫 기록 → 마지막 기록 체중 차이(kg, 소수 한 자리). 잰 날이 하루뿐이면 비교할 게 없어 null
  change: number | null;
  // 날짜마다 하나(같은 날 여러 번이면 마지막), 날짜 순
  points: WeightPoint[];
  daysInMonth: number;
  // 마지막 기록의 체중 말고 다른 항목 (시안: 허리 78cm · 엉덩이 94cm 칩)
  latestOthers: { label: string; value: number; unit: string }[];
};

// 체중 차이를 소수 한 자리로: 68.4 - 69.6 = -1.1999999999999886 (부동소수점) → -1.2
const CHANGE_DECIMALS = 1;

// 타입 상세 체형 요약: 이 달 마지막 체중 + 이 달 변화 + 체중 선 그래프 (2026-10-22 사용자 결정: 달 단위)
export function summarizeBody(
  entries: RecordEntryOf<'body'>[],
  month: string,
): BodySummary {
  // 날짜마다 마지막 기록만. Map은 같은 키에 다시 넣으면 값만 바뀌므로, 조회 순서(날짜·쓴 순서)대로 넣으면 마지막 것이 남는다
  const byDate = new Map<string, RecordEntryOf<'body'>>();
  for (const entry of [...entries].sort((a, b) =>
    a.occurredAt.localeCompare(b.occurredAt),
  )) {
    byDate.set(entry.occurredAt, entry);
  }
  const daily = [...byDate.values()];
  const first = daily.at(0);
  const latest = daily.at(-1);

  return {
    latestWeight: latest?.fields.weight ?? null,
    change:
      first && latest && daily.length > 1
        ? Number(
            (latest.fields.weight - first.fields.weight).toFixed(
              CHANGE_DECIMALS,
            ),
          )
        : null,
    points: daily.map((entry) => ({
      day: Number(entry.occurredAt.slice(DAY_OF_MONTH_START)),
      weight: entry.fields.weight,
    })),
    daysInMonth: getMonthGrid(`${month}-01`)
      .flat()
      .filter((date) => date.startsWith(month)).length,
    latestOthers: latest
      ? listBodyMeasurements(latest.fields)
          .filter((measurement) => measurement.name !== 'weight')
          .map(({ label, value, unit }) => ({ label, value, unit }))
      : [],
  };
}

export type SamePeriod = {
  current: DateRange;
  previous: DateRange;
};

// 지난달과 비교할 "같은 기간" (2026-10-22 사용자 결정: "지난달 같은 기간보다").
// - 이번 달: 1일~오늘 vs 지난달 1일~같은 날. 10월 22일이면 9월 1~22일과 비교해야 공정하다
//   (지난달 전체와 비교하면 달 초에는 늘 "덜 썼어요"가 된다).
//   지난달에 그 날이 없으면 말일까지 (3월 31일 → 2월 28일)
// - 지난 달을 볼 때: 그 달 전체 vs 그 전 달 전체
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

function sumAmountsIn(
  entries: RecordEntryOf<'expense'>[],
  range: DateRange,
): { total: number; count: number } {
  const inRange = entries.filter(
    (entry) => entry.occurredAt >= range.from && entry.occurredAt <= range.to,
  );
  return {
    total: inRange.reduce((sum, entry) => sum + entry.fields.amount, 0),
    count: inRange.length,
  };
}

// 이 달 지출 - 지난달 같은 기간 지출 (원). 음수면 덜 쓴 것.
// 지난달 같은 기간에 기록이 하나도 없으면 null: "0원보다 더 썼어요"는 처음 쓰기 시작한 사람에게 뜻이 없다.
// 두 목록은 달 전체를 받아 여기서 기간으로 자른다: 조회는 타입 상세가 이미 쓰는 "달 전체" 캐시를 그대로 쓰게
export function compareExpensesWithPreviousMonth(
  currentEntries: RecordEntryOf<'expense'>[],
  previousEntries: RecordEntryOf<'expense'>[],
  period: SamePeriod,
): number | null {
  const previous = sumAmountsIn(previousEntries, period.previous);
  if (previous.count === 0) return null;
  return sumAmountsIn(currentEntries, period.current).total - previous.total;
}
