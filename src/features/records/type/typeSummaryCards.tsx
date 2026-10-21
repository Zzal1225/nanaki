import type { ReactNode } from 'react';
import type { RecordEntry, RecordEntryOf } from '../schema/recordEntry';
import type { RecordType } from '../schema/recordTypes';
import { summarizeExpenses, summarizeReviews } from '../ui/typeSummary';
import ExpenseSummaryCard from './ExpenseSummaryCard';
import ReviewSummaryCard from './ReviewSummaryCard';

type SummaryRenderer<T extends RecordType> = (
  entries: RecordEntryOf<T>[],
  monthLabel: string,
) => ReactNode;

// 타입마다 요약 카드 모양이 달라서, "어떤 카드를 그릴지"를 이 목록 한 곳에 모은다.
// 타입 상세 화면은 renderTypeSummary만 불러서 if (type === 'expense')가 없다. 새 타입은 여기에 한 줄
const SUMMARY_RENDERERS: { [T in RecordType]: SummaryRenderer<T> } = {
  expense: (entries, monthLabel) => (
    <ExpenseSummaryCard
      monthLabel={monthLabel}
      summary={summarizeExpenses(entries)}
    />
  ),
  review: (entries, monthLabel) => (
    <ReviewSummaryCard
      monthLabel={monthLabel}
      summary={summarizeReviews(entries)}
    />
  ),
};

// entries는 이 type의 기록만 들어온다(listRecordsOfType이 DB에서 거름). TypeScript는 type과 꺼낸 함수의
// 짝을 추적하지 못해서(correlated union) 여기 한 곳에서만 넓혀 쓴다
export function renderTypeSummary(
  type: RecordType,
  entries: RecordEntry[],
  monthLabel: string,
): ReactNode {
  const render = SUMMARY_RENDERERS[type] as SummaryRenderer<RecordType>;
  return render(entries as never, monthLabel);
}
