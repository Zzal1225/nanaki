import type { ReviewSummary } from '../ui/typeSummary';

type ReviewSummaryCardProps = {
  monthLabel: string;
  summary: ReviewSummary;
};

// 후기 요약: 이번 달 개수 + 대상 종류별 개수.
// 시안의 평균 별점은 뺐다 (2026-10-22 사용자 결정, typeSummary.ts 참고)
// 대상 종류 칩은 지금은 개수만 보여 준다. 눌러서 거르는 건 step2 검색·필터에서 (미구현 기능은 누를 수 없게)
export default function ReviewSummaryCard({
  monthLabel,
  summary,
}: ReviewSummaryCardProps) {
  return (
    <>
      <div className='flex flex-col gap-1'>
        <span className='text-body-sm text-fg-secondary'>
          {monthLabel} 후기
        </span>
        <span className='text-[28px] leading-[34px] font-bold text-fg-primary tabular-nums'>
          {summary.count}건
        </span>
      </div>
      <ul aria-label='대상 종류별 개수' className='flex flex-wrap gap-2'>
        {summary.kinds.map((kind) => (
          <li
            key={kind.name}
            className={`inline-flex h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-body-sm font-medium ${
              kind.count === 0 ? 'text-fg-disabled' : 'text-fg-primary'
            }`}
          >
            {kind.name}
            <span className='text-fg-secondary tabular-nums'>{kind.count}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
