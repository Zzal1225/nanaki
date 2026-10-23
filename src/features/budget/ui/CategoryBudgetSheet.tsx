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
import { applyCategoriesDraft, SAVE_FAILED_MESSAGE } from './budgetDraft';

type CategoryBudgetSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget;
  // 칸을 보여 줄 분류 (화면 순서). 기본 분류 + 예산을 정한 분류 + 이 달 돈을 쓴 분류
  categoryNames: string[];
  onSave: (budget: Budget) => Promise<unknown>;
};

// 분류별 예산 편집 시트. 분류마다 금액 칸 하나, 빈 칸 = 그 분류 예산 없음.
// "분류 추가" 버튼을 따로 두지 않은 이유: 가계부에 직접 입력한 분류는 돈을 쓰는 순간 이 목록에 생긴다
export default function CategoryBudgetSheet({
  open,
  onOpenChange,
  budget,
  categoryNames,
  onSave,
}: CategoryBudgetSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title='분류별 예산'>
      <CategoryBudgetForm
        budget={budget}
        categoryNames={categoryNames}
        onSave={onSave}
        onDone={() => onOpenChange(false)}
      />
    </Sheet>
  );
}

function CategoryBudgetForm({
  budget,
  categoryNames,
  onSave,
  onDone,
}: Pick<CategoryBudgetSheetProps, 'budget' | 'categoryNames' | 'onSave'> & {
  onDone: () => void;
}) {
  const [amounts, setAmounts] = useState<Record<string, number | undefined>>(
    () =>
      Object.fromEntries(
        categoryNames.map((name) => [name, budget.categories[name]]),
      ),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = applyCategoriesDraft(budget, amounts);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setIsSaving(true);
    setSaveError(undefined);
    try {
      await onSave(result.budget);
      onDone();
    } catch {
      setSaveError(SAVE_FAILED_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className='flex flex-col gap-4'>
      <p className='text-caption text-fg-secondary'>
        비워 둔 분류는 예산 없이 써요.
      </p>
      {/* 두 줄로 놓아 8칸 넘게도 한 화면에 가깝게 (모바일 375px에서 칸 하나 약 160px, 99,999,999원까지 들어간다) */}
      <div className='grid grid-cols-2 gap-x-3 gap-y-4'>
        {categoryNames.map((name) => (
          <TextField
            key={name}
            label={name}
            unit='원'
            inputMode='numeric'
            value={formatNumberInput(amounts[name])}
            onChange={(e) => {
              const value = parseNumberInput(e.target.value);
              setAmounts((current) => ({ ...current, [name]: value }));
              setErrors((current) => {
                const next = { ...current };
                delete next[name];
                return next;
              });
            }}
            error={errors[name]}
          />
        ))}
      </div>
      <div role='alert'>
        <FieldError id='category-budget-save-error' message={saveError} />
      </div>
      <Button type='submit' isLoading={isSaving}>
        저장
      </Button>
    </form>
  );
}
