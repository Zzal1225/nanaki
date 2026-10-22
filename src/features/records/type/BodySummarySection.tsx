'use client';

// 'use client' 이유: "최근 체중"을 브라우저에서 따로 불러온다 (TanStack Query)
import { useLatestWeight } from '../hooks/useLatestWeight';
import type { RecordEntryOf } from '../schema/recordEntry';
import { summarizeBody } from '../ui/typeSummary';
import BodySummaryCard from './BodySummaryCard';

type BodySummarySectionProps = {
  // 이 달의 체형 기록 (그래프용)
  entries: RecordEntryOf<'body'>[];
};

// 조회(훅)와 표시(BodySummaryCard)를 나눈다 (CLAUDE.md: 훅이 조회, 컴포넌트는 표시).
// 다른 요약 카드는 이 달 기록만으로 그려지지만, 체형은 "최근 체중"이 달과 상관없어서 조회가 하나 더 있다.
// 그 조회가 실패하거나 불러오는 중이면 "—"로 두고 그래프는 그대로 보여 준다
export default function BodySummarySection({
  entries,
}: BodySummarySectionProps) {
  const latestWeight = useLatestWeight();
  return (
    <BodySummaryCard
      latestWeight={latestWeight.data ?? null}
      summary={summarizeBody(entries)}
    />
  );
}
