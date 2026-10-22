import type { ReactNode } from 'react';
import type { RecordEntry, RecordEntryOf } from '../schema/recordEntry';
import type { RecordType } from '../schema/recordTypes';
import {
  compareExpensesWithPreviousMonth,
  getSamePeriod,
  summarizeBody,
  summarizeExpenses,
  summarizeReviews,
  summarizeWorkouts,
} from '../ui/typeSummary';
import BodySummaryCard from './BodySummaryCard';
import ExpenseSummaryCard from './ExpenseSummaryCard';
import ReviewSummaryCard from './ReviewSummaryCard';
import WorkoutSummaryCard from './WorkoutSummaryCard';

// 카드가 그릴 때 쓰는 주변 정보. 인자를 하나씩 늘리지 않고 묶어 두어, 새 카드가 필요한 값만 꺼내 쓴다
export type SummaryContext = {
  // 화면 글자("10월")
  monthLabel: string;
  // 'YYYY-MM' (운동의 주별 시간, 체형 그래프의 가로축)
  month: string;
  // 'YYYY-MM-DD' (지난달 같은 기간 계산)
  today: string;
  // 지난달 전체 기록. 지난달과 비교하는 타입만 받고, 불러오는 중이면 undefined
  previousEntries: RecordEntry[] | undefined;
};

type SummaryRenderer<T extends RecordType> = (
  entries: RecordEntryOf<T>[],
  context: Omit<SummaryContext, 'previousEntries'> & {
    previousEntries: RecordEntryOf<T>[] | undefined;
  },
) => ReactNode;

// 지난달 기록을 더 불러와 비교하는 타입. 타입 상세는 이 표만 보고 지난달 조회 여부를 정한다 (if type === ... 없이).
// 지금은 가계부만 (2026-10-22 사용자 결정). 운동·체형의 비교 규칙은 로드맵 21·22에 메모해 두었다
const COMPARES_WITH_PREVIOUS_MONTH: Record<RecordType, boolean> = {
  expense: true,
  review: false,
  workout: false,
  body: false,
};

export function comparesWithPreviousMonth(type: RecordType): boolean {
  return COMPARES_WITH_PREVIOUS_MONTH[type];
}

// 타입마다 요약 카드 모양이 달라서, "어떤 카드를 그릴지"를 이 목록 한 곳에 모은다.
// 타입 상세 화면은 renderTypeSummary만 불러서 if (type === 'expense')가 없다. 새 타입은 여기에 한 줄
const SUMMARY_RENDERERS: { [T in RecordType]: SummaryRenderer<T> } = {
  expense: (entries, { monthLabel, month, today, previousEntries }) => {
    const period = getSamePeriod(month, today);
    return (
      <ExpenseSummaryCard
        monthLabel={monthLabel}
        summary={summarizeExpenses(entries)}
        differenceFromPreviousMonth={
          period && previousEntries
            ? compareExpensesWithPreviousMonth(entries, previousEntries, period)
            : null
        }
      />
    );
  },
  review: (entries, { monthLabel }) => (
    <ReviewSummaryCard
      monthLabel={monthLabel}
      summary={summarizeReviews(entries)}
    />
  ),
  workout: (entries, { monthLabel, month }) => (
    <WorkoutSummaryCard
      monthLabel={monthLabel}
      summary={summarizeWorkouts(entries, month)}
    />
  ),
  body: (entries, { monthLabel, month }) => (
    <BodySummaryCard
      monthLabel={monthLabel}
      summary={summarizeBody(entries, month)}
    />
  ),
};

// entries는 이 type의 기록만 들어온다(listRecordsOfType이 DB에서 거름). TypeScript는 type과 꺼낸 함수의
// 짝을 추적하지 못해서(correlated union) 여기 한 곳에서만 넓혀 쓴다
export function renderTypeSummary(
  type: RecordType,
  entries: RecordEntry[],
  context: SummaryContext,
): ReactNode {
  const render = SUMMARY_RENDERERS[type] as SummaryRenderer<RecordType>;
  return render(entries as never, context as never);
}
