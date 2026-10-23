'use client';

// 'use client' 이유: 시트 안 입력값·저장 중 상태를 들고 있다
import { useState, type FormEvent } from 'react';
import {
  formatNumberInput,
  parseNumberInput,
} from '@/features/records/form/inputValue';
import Button from '@/shared/ui/Button';
import FieldError from '@/shared/ui/FieldError';
import Sheet from '@/shared/ui/Sheet';
import TextField from '@/shared/ui/TextField';
import type { Budget } from '../schema/budget';
import { applyTotalDraft, SAVE_FAILED_MESSAGE } from './budgetDraft';

type TotalBudgetSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthLabel: string;
  budget: Budget;
  onSave: (budget: Budget) => Promise<unknown>;
};

// 전체 예산 수정 시트 (모바일 바텀시트 / PC 오른쪽 패널, 공통 Sheet)
export default function TotalBudgetSheet({
  open,
  onOpenChange,
  monthLabel,
  budget,
  onSave,
}: TotalBudgetSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`${monthLabel} 예산`}>
      {/* 닫히면 내용이 사라져서 열 때마다 지금 예산으로 입력칸을 새로 채운다 (고치다 만 값이 남지 않게, 필터 시트와 같은 방식) */}
      <TotalBudgetForm
        budget={budget}
        onSave={onSave}
        onDone={() => onOpenChange(false)}
      />
    </Sheet>
  );
}

function TotalBudgetForm({
  budget,
  onSave,
  onDone,
}: Pick<TotalBudgetSheetProps, 'budget' | 'onSave'> & { onDone: () => void }) {
  const [total, setTotal] = useState<number | undefined>(
    budget.total ?? undefined,
  );
  const [error, setError] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    // form 제출로 받는 이유: 숫자 자판의 "완료"·Enter로도 저장된다
    event.preventDefault();
    const result = applyTotalDraft(budget, total);
    if (!result.ok) {
      setError(result.errors);
      return;
    }
    setIsSaving(true);
    setSaveError(undefined);
    try {
      await onSave(result.budget);
      onDone();
    } catch {
      // 시트를 닫지 않는다: 입력한 값이 남아 있어야 연결이 돌아왔을 때 그대로 다시 누른다
      setSaveError(SAVE_FAILED_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className='flex flex-col gap-4'>
      <TextField
        label='전체 예산'
        unit='원'
        inputMode='numeric'
        // 빈 칸으로 두면 전체 예산 없이 분류별 예산만 쓴다
        placeholder='정하지 않음'
        value={formatNumberInput(total)}
        onChange={(e) => {
          setTotal(parseNumberInput(e.target.value));
          setError(undefined);
        }}
        error={error}
      />
      <p className='text-caption text-fg-secondary'>
        비워 두면 전체 예산 없이 분류별 예산만 써요. 다른 달 예산은 바뀌지
        않아요.
      </p>
      {/* 저장 실패는 입력칸 오류가 아니라 바로 읽어 줘야 하는 알림이라 role=alert 상자에 둔다 */}
      <div role='alert'>
        <FieldError id='total-budget-save-error' message={saveError} />
      </div>
      <Button type='submit' isLoading={isSaving}>
        저장
      </Button>
    </form>
  );
}
