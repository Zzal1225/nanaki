import { ChevronRight, CircleAlert } from 'lucide-react';
import Link from 'next/link';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import type { BudgetProgress } from '../budgetProgress';
import { budgetRemainingText, formatWon } from '../budgetText';
import BudgetBar from './BudgetBar';

type BudgetSummaryLineProps = {
  href: string;
  // null = 예산을 한 번도 정하지 않음 → "예산 정하기"
  progress: BudgetProgress | null;
};

const LINK_CLASS =
  'flex min-h-11 items-center gap-2 rounded-md text-fg-primary hover:bg-surface-hover active:bg-surface-pressed';

const CHEVRON = (
  <ChevronRight
    aria-hidden='true'
    size={ICON_SIZE.sm}
    strokeWidth={ICON_STROKE_WIDTH}
    className='shrink-0 text-fg-secondary'
  />
);

// 가계부 요약 카드의 예산 줄 (시안 13a: "예산 600,000원 69% · 187,700원 남았어요 · 12일 남음").
// 줄 전체가 예산 화면으로 가는 링크다 (예산 화면의 유일한 입구, 2026-10-23 사용자 결정). 조회는 부르는 쪽(ExpenseBudgetSection)이 한다
export default function BudgetSummaryLine({
  href,
  progress,
}: BudgetSummaryLineProps) {
  if (!progress) {
    return (
      <Link
        href={href}
        className={`${LINK_CLASS} -mx-2 px-2 text-body-sm font-semibold text-accent`}
      >
        <span className='flex-1'>예산 정하기</span>
        {CHEVRON}
      </Link>
    );
  }

  const overCount = progress.categories.filter((c) => c.isOver).length;

  // 분류별 예산만 쓰는 사람: 전체 막대 대신 분류 개수와 넘은 개수
  if (progress.total === null || progress.percent === null) {
    return (
      <Link href={href} className={`${LINK_CLASS} -mx-2 px-2 text-body-sm`}>
        <span className='flex-1'>
          분류별 예산 {progress.categories.length}개
          {overCount > 0 && (
            <span className='font-semibold text-danger'>
              {' '}
              · {overCount}개 초과
            </span>
          )}
        </span>
        {CHEVRON}
      </Link>
    );
  }

  const remainingText = budgetRemainingText(progress);
  return (
    <Link href={href} className={`${LINK_CLASS} -mx-2 px-2 py-1 tabular-nums`}>
      <span className='flex min-w-0 flex-1 flex-col gap-2'>
        <span className='flex justify-between text-body-sm'>
          <span>예산 {formatWon(progress.total)}</span>
          <b className='font-semibold'>{progress.percent}%</b>
        </span>
        <BudgetBar
          percent={progress.percent}
          isOver={progress.isOver}
          size='md'
        />
        {remainingText && (
          <span
            className={`flex items-center gap-1 text-caption font-medium ${progress.isOver ? 'text-danger' : 'text-fg-secondary'}`}
          >
            {/* 넘었을 때 색만 바꾸지 않고 아이콘 + "넘었어요" 글자로도 알린다 */}
            {progress.isOver && (
              <CircleAlert
                aria-hidden='true'
                size={14}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            )}
            {remainingText}
          </span>
        )}
      </span>
      {CHEVRON}
    </Link>
  );
}
