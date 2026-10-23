import { formatExpenseAmount } from '@/features/records/ui/recordPresentation';
import type { BudgetProgress } from '../budgetProgress';
import { budgetRemainingShortText, formatWon } from '../budgetText';
import BudgetBar from './BudgetBar';
import EditButton from './EditButton';

type TotalBudgetCardProps = {
  monthLabel: string;
  progress: BudgetProgress;
  canEdit: boolean;
  onEdit: () => void;
};

// 예산 화면 맨 위: 그 달 전체 예산 (시안 18). 전체 예산이 없으면 쓴 돈만 보이고 "정하기"
export default function TotalBudgetCard({
  monthLabel,
  progress,
  canEdit,
  onEdit,
}: TotalBudgetCardProps) {
  const hasTotal = progress.total !== null && progress.percent !== null;
  const remainingText = budgetRemainingShortText(progress);

  return (
    <section
      aria-label={`${monthLabel} 전체 예산`}
      className='flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-card'
    >
      <div className='flex items-center justify-between'>
        <h2 className='text-body-sm text-fg-secondary'>{monthLabel} 예산</h2>
        <EditButton
          label={hasTotal ? '수정' : '정하기'}
          accessibleLabel={`${monthLabel} 전체 예산 ${hasTotal ? '수정' : '정하기'}`}
          disabled={!canEdit}
          onClick={onEdit}
        />
      </div>
      {hasTotal ? (
        <>
          <span className='text-[28px] leading-[34px] font-bold tracking-[-0.01em] text-fg-primary tabular-nums'>
            {formatWon(progress.total ?? 0)}
          </span>
          <BudgetBar
            percent={progress.percent ?? 0}
            isOver={progress.isOver}
            size='md'
          />
          <div className='flex flex-wrap justify-between gap-x-3 text-body-sm text-fg-primary tabular-nums'>
            <span>
              {formatExpenseAmount(progress.spent)} 썼어요 ·{' '}
              <b className='font-semibold'>{progress.percent}%</b>
            </span>
            <span
              className={
                progress.isOver
                  ? 'font-semibold text-danger'
                  : 'text-fg-secondary'
              }
            >
              {remainingText}
            </span>
          </div>
        </>
      ) : (
        <p className='text-body text-fg-primary tabular-nums'>
          전체 예산을 정하지 않았어요 · {formatExpenseAmount(progress.spent)}{' '}
          썼어요
        </p>
      )}
    </section>
  );
}
