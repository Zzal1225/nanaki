import type { RecordEntryOf } from '../schema/recordEntry';
import { REVIEW_TARGET_KINDS } from '../schema/review';

const PERCENT = 100;
const AVERAGE_DECIMALS = 1;

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
  // 후기가 없으면 null (0점 평균처럼 보이지 않게)
  average: number | null;
  // 고정 선택지 4개를 모두, 0개인 종류도 (시안: 경험 0)
  kinds: { name: string; count: number }[];
};

// 타입 상세 후기 요약: 개수 + 평균 별점 + 대상 종류별 개수
export function summarizeReviews(
  entries: RecordEntryOf<'review'>[],
): ReviewSummary {
  const count = entries.length;
  const ratingSum = entries.reduce(
    (sum, entry) => sum + entry.fields.rating,
    0,
  );
  const average =
    count === 0 ? null : Number((ratingSum / count).toFixed(AVERAGE_DECIMALS));

  const kinds = REVIEW_TARGET_KINDS.map((name) => ({
    name,
    count: entries.filter((entry) => entry.fields.targetKind === name).length,
  }));

  return { count, average, kinds };
}
