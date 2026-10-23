import type { ReactNode } from 'react';
import { formatExpenseAmount } from '../ui/recordPresentation';
import type { ExpenseSummary } from '../ui/typeSummary';

type ExpenseSummaryCardProps = {
  monthLabel: string;
  summary: ExpenseSummary;
  // 예산 줄 (features/budget). 이 카드는 그리기만 하고 예산 조회는 모른다: 자리만 받아 시안 순서(지출 → 예산 → 분류별)에 놓는다
  budget?: ReactNode;
  // 고정지출 화면으로 가는 줄 (features/fixedExpenses). 예산 줄 바로 아래
  fixedExpenses?: ReactNode;
};

// 가계부 요약: 이번 달 지출 + 예산 줄 + 분류별 막대 (시안 13a).
// 분류마다 색을 늘리지 않고 같은 가계부 색의 막대 길이로만 비교한다 (시안 규칙)
export default function ExpenseSummaryCard({
  monthLabel,
  summary,
  budget,
  fixedExpenses,
}: ExpenseSummaryCardProps) {
  return (
    <>
      <div className='flex flex-col gap-1'>
        <span className='text-body-sm text-fg-secondary'>
          {monthLabel} 지출
        </span>
        <span className='text-[28px] leading-[34px] font-bold tracking-[-0.01em] text-fg-primary tabular-nums'>
          {formatExpenseAmount(summary.total)}
        </span>
      </div>
      {budget}
      {fixedExpenses}
      {summary.categories.length > 0 && (
        <div className='flex flex-col gap-2 border-t border-border pt-4'>
          <h2 className='text-body-sm font-semibold text-fg-primary'>분류별</h2>
          <ul className='flex flex-col gap-2'>
            {summary.categories.map((category) => (
              <li
                key={category.name}
                // 시안 규격: 이름 | 막대 | 비율 | 금액. 막대는 남는 폭을 모두 쓴다
                className='grid grid-cols-[minmax(36px,auto)_minmax(0,1fr)_32px_92px] items-center gap-2 text-body-sm text-fg-primary tabular-nums'
              >
                <span className='truncate'>{category.name}</span>
                {/* 막대는 장식. 같은 정보가 옆의 % 글자로 있어서 스크린 리더에는 숨긴다 */}
                <span
                  aria-hidden='true'
                  className='h-1.5 overflow-hidden rounded-full bg-surface-pressed'
                >
                  <span
                    className='block h-full rounded-full bg-type-expense'
                    // 길이는 데이터마다 달라서 클래스가 아니라 style로 (Tailwind는 미리 모르는 값을 만들 수 없다)
                    style={{ width: `${category.percent}%` }}
                  />
                </span>
                <span className='text-right text-fg-secondary'>
                  {category.percent}%
                </span>
                <span className='text-right'>
                  {formatExpenseAmount(category.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
