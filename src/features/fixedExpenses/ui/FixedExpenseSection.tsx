'use client';

// 'use client' 이유: 고정지출을 브라우저에서 불러오고(기기 사본), 시트 열림 상태를 들고 있다
import { useState } from 'react';
import Button from '@/shared/ui/Button';
import type { FixedExpense } from '../schema/fixedExpense';
import {
  useDeleteFixedExpense,
  useFixedExpenses,
  useUpdateFixedExpense,
} from '../hooks/useFixedExpenses';
import FixedExpenseList from './FixedExpenseList';
import FixedExpenseSheet from './FixedExpenseSheet';

type FixedExpenseSectionProps = {
  today: string;
  // 바꾸기는 온라인 전용 (fixedExpenseStore). 오프라인이면 보기만
  canEdit: boolean;
};

// 고정지출 화면의 본문 (FixedExpensesScreen): 목록 + 수정 시트. 조회는 여기서, 표시는 FixedExpenseList
export default function FixedExpenseSection({
  today,
  canEdit,
}: FixedExpenseSectionProps) {
  const fixedExpenses = useFixedExpenses();
  const update = useUpdateFixedExpense();
  const remove = useDeleteFixedExpense();
  // 시트 열림은 이 화면 안에서만 쓰는 상태라 주소에 두지 않는다 (예산 시트와 같은 판단)
  const [sheet, setSheet] = useState<FixedExpense | null>(null);

  if (fixedExpenses.isPending) {
    return (
      <div
        aria-busy='true'
        className='h-40 animate-pulse rounded-lg bg-surface-hover'
      />
    );
  }

  if (fixedExpenses.isError) {
    return (
      <div role='alert' className='flex flex-col items-start gap-3'>
        <p className='text-body text-fg-primary'>
          고정지출을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
        <Button
          variant='secondary'
          onClick={() => void fixedExpenses.refetch()}
        >
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <>
      <FixedExpenseList
        items={fixedExpenses.data}
        today={today}
        canEdit={canEdit}
        onEdit={setSheet}
      />
      <FixedExpenseSheet
        item={sheet}
        onClose={() => setSheet(null)}
        onUpdate={(id, input) => update.mutateAsync({ id, input })}
        onDelete={(id) => remove.mutateAsync(id)}
      />
    </>
  );
}
