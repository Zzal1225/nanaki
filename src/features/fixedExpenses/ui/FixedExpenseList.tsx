import { Check, Plus, Repeat } from 'lucide-react';
import { formatExpenseAmount } from '@/features/records/ui/recordPresentation';
import { formatSchedule } from '@/shared/schedule/schedule';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import {
  formatFixedExpenseStatus,
  getFixedExpenseStatus,
  sumFixedExpenses,
} from '../fixedExpenseStatus';
import type { FixedExpense } from '../schema/fixedExpense';

type FixedExpenseListProps = {
  items: FixedExpense[];
  today: string;
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (item: FixedExpense) => void;
};

// 고정지출 목록 (시안 18 아래쪽): 반복 아이콘 · 이름 / "매달 5일 · ✓ 기록됨" · 금액, 맨 아래 자동 기록 안내와 이번 달 합계.
// 표시만 한다. 조회·시트는 FixedExpenseSection
export default function FixedExpenseList({
  items,
  today,
  canEdit,
  onAdd,
  onEdit,
}: FixedExpenseListProps) {
  return (
    <section aria-labelledby='fixed-expense-title' className='flex flex-col'>
      <div className='flex items-center justify-between px-1 pb-2'>
        <h2
          id='fixed-expense-title'
          className='text-body font-semibold text-fg-primary'
        >
          고정지출
        </h2>
        <button
          type='button'
          disabled={!canEdit}
          onClick={onAdd}
          aria-label='고정지출 추가'
          className='-my-3 -mr-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-body-sm font-semibold text-accent enabled:hover:bg-surface-hover enabled:active:bg-surface-pressed disabled:text-fg-disabled'
        >
          <Plus
            aria-hidden='true'
            size={ICON_SIZE.sm}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          추가
        </button>
      </div>

      {items.length === 0 ? (
        <p className='rounded-lg bg-surface p-4 text-body-sm text-fg-secondary shadow-card'>
          통신비·구독료처럼 매달 나가는 돈을 추가하면 그날 자동으로 가계부에
          기록돼요
        </p>
      ) : (
        <>
          <ul className='overflow-hidden rounded-lg bg-surface shadow-card'>
            {items.map((item) => {
              const status = getFixedExpenseStatus(item, today);
              return (
                <li
                  key={item.id}
                  className='border-t border-border first:border-t-0'
                >
                  {/* 줄 전체가 수정 시트를 연다 (해지도 그 안에). 오프라인이면 보기만 */}
                  <button
                    type='button'
                    disabled={!canEdit}
                    onClick={() => onEdit(item)}
                    className='flex min-h-16 w-full items-center gap-3 py-3 pr-4 pl-3 text-left enabled:hover:bg-surface-hover enabled:active:bg-surface-pressed'
                  >
                    <span className='flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-type-expense-subtle text-type-expense'>
                      <Repeat
                        aria-hidden='true'
                        size={18}
                        strokeWidth={ICON_STROKE_WIDTH}
                      />
                    </span>
                    <span className='flex min-w-0 flex-1 flex-col gap-1'>
                      <span className='truncate text-body font-semibold text-fg-primary'>
                        {item.name}
                      </span>
                      <span className='flex items-center gap-1 text-caption font-medium text-fg-secondary tabular-nums'>
                        {formatSchedule(item.schedule)} ·
                        {/* 기록됨은 아이콘 + 글자 (색만으로 알리지 않음) */}
                        {status.kind === 'recorded' && (
                          <Check
                            aria-hidden='true'
                            size={12}
                            strokeWidth={2.5}
                            className='text-success'
                          />
                        )}
                        {formatFixedExpenseStatus(status)}
                      </span>
                    </span>
                    <span className='shrink-0 text-body font-semibold text-fg-primary tabular-nums'>
                      {formatExpenseAmount(item.amount)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className='mx-1 mt-2 text-caption font-medium text-fg-secondary tabular-nums'>
            매달 그날 자동으로 가계부에 기록돼요. 이번 달 고정지출{' '}
            {formatExpenseAmount(sumFixedExpenses(items))}
          </p>
        </>
      )}
    </section>
  );
}
