import { getMonthGrid } from '@/shared/date/calendar';
import type { BodyMeasure } from '../schema/body';
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

export type MeasurePoint = {
  // 'YYYY-MM-DD'
  date: string;
  value: number;
};

export type BodySummary = {
  // 날짜마다 하나(같은 날 여러 번이면 마지막), 날짜 순. 체중·허리둘레를 따로 (2026-10-22 사용자 결정: 그래프를 나눈다)
  points: Record<BodyMeasure, MeasurePoint[]>;
};

// 타입 상세 체형 그래프의 점들. 가로축은 1~31일이 아니라 실제로 잰 날들이다 (사용자 결정): 한 달에 몇 번 안 재면
// 1~31일 축에서는 점이 한쪽에 몰리고 가운데가 비어 변화가 잘 안 보인다.
// "최근 체중"(달과 상관없이 전체 기록 중 마지막)은 여기서 계산하지 않는다: 이 달 기록만으로는 알 수 없어 따로 조회한다
export function summarizeBody(entries: RecordEntryOf<'body'>[]): BodySummary {
  const sorted = [...entries].sort((a, b) =>
    a.occurredAt.localeCompare(b.occurredAt),
  );
  function dailyPoints(measure: BodyMeasure): MeasurePoint[] {
    // 같은 날짜 키에 다시 넣으면 값만 바뀐다 → 날짜순(정렬은 안정 정렬이라 같은 날은 쓴 순서)으로 넣으면 마지막 것이 남는다
    const byDate = new Map<string, number>();
    for (const entry of sorted) {
      const value = entry.fields[measure];
      if (value !== undefined) byDate.set(entry.occurredAt, value);
    }
    return [...byDate].map(([date, value]) => ({ date, value }));
  }
  return {
    points: { weight: dailyPoints('weight'), waist: dailyPoints('waist') },
  };
}
