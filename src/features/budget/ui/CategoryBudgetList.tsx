import { CircleAlert } from 'lucide-react';
import { formatExpenseAmount } from '@/features/records/ui/recordPresentation';
import { ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import type { BudgetProgress } from '../budgetProgress';
import { formatWon, overAmountText } from '../budgetText';
import BudgetBar from './BudgetBar';
import EditButton from './EditButton';

type CategoryBudgetListProps = {
  progress: BudgetProgress;
  canEdit: boolean;
  onEdit: () => void;
};

const ROW_CLASS =
  'flex flex-col gap-2 border-t border-border px-4 py-3 first:border-t-0';

// 분류별 예산 (시안 18): 이름 · (초과 뱃지) · 쓴 돈 / 예산 + 막대.
// 넘은 분류는 막대 색(danger) + 아이콘 + "N원 초과" 글자를 함께 쓴다: 색을 구분하지 못해도 알 수 있게.
// 예산 없이 돈만 쓴 분류도 "예산 없음"으로 같은 목록에 둔다 (어디에 예산이 빠졌는지 보이게)
export default function CategoryBudgetList({
  progress,
  canEdit,
  onEdit,
}: CategoryBudgetListProps) {
  const isEmpty =
    progress.categories.length === 0 && progress.unbudgeted.length === 0;
  const hasBudget = progress.categories.length > 0;

  return (
    <section aria-labelledby='category-budget-title' className='flex flex-col'>
      <div className='flex items-center justify-between px-1 pb-2'>
        <h2
          id='category-budget-title'
          className='text-body font-semibold text-fg-primary'
        >
          분류별 예산
        </h2>
        <EditButton
          label={hasBudget ? '편집' : '정하기'}
          accessibleLabel={`분류별 예산 ${hasBudget ? '편집' : '정하기'}`}
          disabled={!canEdit}
          onClick={onEdit}
        />
      </div>
      {isEmpty ? (
        <p className='rounded-lg bg-surface p-4 text-body-sm text-fg-secondary shadow-card'>
          분류별 예산이 없어요
        </p>
      ) : (
        <ul className='overflow-hidden rounded-lg bg-surface shadow-card'>
          {progress.categories.map((category) => (
            <li key={category.name} className={ROW_CLASS}>
              <div className='flex items-center gap-2 text-body tabular-nums'>
                <span className='min-w-0 flex-1 truncate font-medium text-fg-primary'>
                  {category.name}
                </span>
                {category.isOver && (
                  <span className='inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-surface-hover px-2 text-caption font-semibold text-danger'>
                    <CircleAlert
                      aria-hidden='true'
                      size={14}
                      strokeWidth={ICON_STROKE_WIDTH}
                    />
                    {overAmountText(category.spent, category.limit)}
                  </span>
                )}
                <span className='shrink-0 text-body-sm'>
                  <b className='font-semibold text-fg-primary'>
                    {formatExpenseAmount(category.spent)}
                  </b>
                  <span className='text-fg-secondary'>
                    {' '}
                    / {formatWon(category.limit)}
                  </span>
                </span>
              </div>
              <BudgetBar
                percent={category.percent}
                isOver={category.isOver}
                size='sm'
              />
            </li>
          ))}
          {progress.unbudgeted.map((category) => (
            <li key={category.name} className={ROW_CLASS}>
              <div className='flex items-center gap-2 text-body tabular-nums'>
                <span className='min-w-0 flex-1 truncate font-medium text-fg-primary'>
                  {category.name}
                </span>
                <span className='shrink-0 text-body-sm'>
                  <b className='font-semibold text-fg-primary'>
                    {formatExpenseAmount(category.spent)}
                  </b>
                  <span className='text-fg-secondary'> / 예산 없음</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
