'use client';

// 'use client' 이유: 시트 안 입력값·저장 중 상태·해지 확인 창을 들고 있다
import { RadioGroup } from 'radix-ui';
import { useState, type FormEvent } from 'react';
import {
  formatNumberInput,
  parseNumberInput,
} from '@/features/records/form/inputValue';
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from '@/features/records/schema/expense';
import { toMonthString } from '@/shared/date/month';
import Button from '@/shared/ui/Button';
import ChipSelect from '@/shared/ui/ChipSelect';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import FieldError from '@/shared/ui/FieldError';
import Sheet from '@/shared/ui/Sheet';
import { withObjectParticle } from '@/shared/text/withObjectParticle';
import TextField from '@/shared/ui/TextField';
import {
  dueDateInMonth,
  formatMonthDay,
  isDueDatePassed,
  nextDueDate,
} from '../fixedExpenseDates';
import {
  fixedExpenseInputSchema,
  MAX_FIXED_EXPENSE_NAME_LENGTH,
  type FixedExpense,
  type FixedExpenseInput,
} from '../schema/fixedExpense';

export type FixedExpenseSheetMode =
  { kind: 'add' } | { kind: 'edit'; item: FixedExpense };

type FixedExpenseSheetProps = {
  mode: FixedExpenseSheetMode | null;
  onClose: () => void;
  today: string;
  onCreate: (
    input: FixedExpenseInput,
    includeCurrentMonth: boolean,
  ) => Promise<unknown>;
  onUpdate: (id: string, input: FixedExpenseInput) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
};

const SAVE_FAILED_MESSAGE =
  '저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.';
const DELETE_FAILED_MESSAGE =
  '해지하지 못했어요. 연결을 확인하고 다시 시도해 주세요.';

// 고정지출 추가·수정 시트 (모바일 바텀시트 / PC 오른쪽 패널, 공통 Sheet). 해지(삭제)는 수정 시트 안에
export default function FixedExpenseSheet(props: FixedExpenseSheetProps) {
  const { mode, onClose } = props;
  return (
    <Sheet
      open={mode !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={mode?.kind === 'edit' ? '고정지출 수정' : '고정지출 추가'}
    >
      {/* 열 때마다 새로 그려 입력칸을 지금 값으로 채운다 (예산 시트와 같은 방식). key: 다른 줄을 열면 새 초안 */}
      {mode && (
        <FixedExpenseForm
          key={mode.kind === 'edit' ? mode.item.id : 'add'}
          {...props}
          mode={mode}
        />
      )}
    </Sheet>
  );
}

type Draft = {
  name: string;
  amount: number | undefined;
  category: string | undefined;
  paymentMethod: string | undefined;
  day: number | undefined;
};

type FieldName = 'name' | 'amount' | 'category' | 'paymentMethod' | 'day';

function toDraft(mode: FixedExpenseSheetMode): Draft {
  if (mode.kind === 'add') {
    return {
      name: '',
      amount: undefined,
      category: undefined,
      paymentMethod: undefined,
      day: undefined,
    };
  }
  const { item } = mode;
  return {
    name: item.name,
    amount: item.amount,
    category: item.category,
    paymentMethod: item.paymentMethod,
    day: item.schedule.day,
  };
}

// Zod 오류 경로 → 칸 이름 (schedule.day는 "결제일" 칸)
function toFieldName(path: readonly PropertyKey[]): FieldName | null {
  const [first] = path;
  if (first === 'schedule') return 'day';
  if (
    first === 'name' ||
    first === 'amount' ||
    first === 'category' ||
    first === 'paymentMethod'
  ) {
    return first;
  }
  return null;
}

function FixedExpenseForm({
  mode,
  onClose,
  today,
  onCreate,
  onUpdate,
  onDelete,
}: Omit<FixedExpenseSheetProps, 'mode'> & { mode: FixedExpenseSheetMode }) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(mode));
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  // 이번 달 결제일이 지났을 때 그 지출도 지금 기록할지. 기본은 "다음 결제일부터" (2026-10-23 사용자 결정)
  const [includeCurrentMonth, setIncludeCurrentMonth] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isValidDay =
    draft.day !== undefined && draft.day >= 1 && draft.day <= 31;
  // 추가할 때만 묻는다: 수정은 시작일·기록 여부를 건드리지 않는다 (fixedExpenseStore.updateFixedExpense)
  const asksCurrentMonth =
    mode.kind === 'add' && isValidDay && isDueDatePassed(draft.day ?? 1, today);
  const passedDueDate = isValidDay
    ? dueDateInMonth(draft.day ?? 1, toMonthString(today))
    : null;
  const nextDue = isValidDay ? nextDueDate(draft.day ?? 1, today, null) : null;

  function update<K extends keyof Draft>(name: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent) {
    // form 제출로 받는 이유: 키보드의 "완료"·Enter로도 저장된다
    event.preventDefault();
    const result = fixedExpenseInputSchema.safeParse({
      name: draft.name,
      amount: draft.amount,
      category: draft.category,
      paymentMethod: draft.paymentMethod,
      schedule: { kind: 'monthly', day: draft.day },
    });
    if (!result.success) {
      const nextErrors: Partial<Record<FieldName, string>> = {};
      for (const issue of result.error.issues) {
        const field = toFieldName(issue.path);
        // 칸마다 첫 오류만 (같은 칸에 여러 규칙이 걸려도 한 줄로)
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }
    setIsSaving(true);
    setSaveError(undefined);
    try {
      if (mode.kind === 'add') {
        await onCreate(result.data, asksCurrentMonth && includeCurrentMonth);
      } else {
        await onUpdate(mode.item.id, result.data);
      }
      onClose();
    } catch {
      // 시트를 닫지 않는다: 입력한 값이 남아 있어야 연결이 돌아왔을 때 그대로 다시 누른다
      setSaveError(SAVE_FAILED_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (mode.kind !== 'edit') return;
    setIsDeleting(true);
    try {
      await onDelete(mode.item.id);
      setIsConfirmOpen(false);
      onClose();
    } catch {
      setIsConfirmOpen(false);
      setSaveError(DELETE_FAILED_MESSAGE);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className='flex flex-col gap-5'>
      <TextField
        label='이름'
        placeholder='예: 통신비'
        maxLength={MAX_FIXED_EXPENSE_NAME_LENGTH}
        value={draft.name}
        onChange={(e) => update('name', e.target.value)}
        error={errors.name}
      />
      <TextField
        label='금액'
        unit='원'
        inputMode='numeric'
        value={formatNumberInput(draft.amount)}
        onChange={(e) => update('amount', parseNumberInput(e.target.value))}
        error={errors.amount}
      />
      <div className='flex flex-col gap-1'>
        <TextField
          label='매달 며칠'
          unit='일'
          inputMode='numeric'
          value={draft.day === undefined ? '' : String(draft.day)}
          onChange={(e) => update('day', parseNumberInput(e.target.value))}
          error={errors.day}
        />
        <p className='text-caption text-fg-secondary'>
          31일이 없는 달은 말일에 기록돼요
        </p>
      </div>

      {asksCurrentMonth && passedDueDate && nextDue && (
        <fieldset className='flex flex-col gap-2'>
          <legend className='mb-2 text-body-sm font-medium text-fg-primary'>
            이번 달 지출은 어떻게 할까요?
          </legend>
          <RadioGroup.Root
            value={includeCurrentMonth ? 'include' : 'next'}
            onValueChange={(value) =>
              setIncludeCurrentMonth(value === 'include')
            }
            className='flex flex-col gap-2'
          >
            {[
              { value: 'next', label: '다음 결제일부터 기록하기' },
              {
                value: 'include',
                label: `이번 달 지출도 기록하기 (${formatMonthDay(passedDueDate)})`,
              },
            ].map((option) => (
              <RadioGroup.Item
                key={option.value}
                value={option.value}
                className='flex min-h-11 items-center gap-3 rounded-md border border-border bg-surface px-3 text-left text-body-sm text-fg-primary data-[state=checked]:border-accent data-[state=checked]:ring-1 data-[state=checked]:ring-accent'
              >
                {/* 고른 칸 표시: 테두리 색만이 아니라 동그라미 안 점으로도 */}
                <span
                  aria-hidden='true'
                  className='flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-border'
                >
                  <RadioGroup.Indicator className='size-2.5 rounded-full bg-accent' />
                </span>
                {option.label}
              </RadioGroup.Item>
            ))}
          </RadioGroup.Root>
          <p className='text-caption text-fg-secondary'>
            {includeCurrentMonth
              ? `${formatMonthDay(passedDueDate)} 날짜로 지금 기록하고, ${formatMonthDay(nextDue)}부터 자동 기록돼요.`
              : `${formatMonthDay(nextDue)}부터 자동 기록돼요. 이번 달 지출은 추가하지 않아요.`}
          </p>
        </fieldset>
      )}

      <ChipSelect
        label='분류'
        options={EXPENSE_CATEGORIES}
        allowCustom
        value={draft.category}
        onChange={(value) => update('category', value)}
        error={errors.category}
      />
      <ChipSelect
        label='결제수단 (선택)'
        options={PAYMENT_METHODS}
        allowCustom
        value={draft.paymentMethod}
        onChange={(value) => update('paymentMethod', value)}
        error={errors.paymentMethod}
      />

      {/* 저장·해지 실패는 칸 오류가 아니라 바로 읽어 줘야 하는 알림 */}
      <div role='alert'>
        <FieldError id='fixed-expense-save-error' message={saveError} />
      </div>
      <Button type='submit' isLoading={isSaving}>
        저장
      </Button>
      {mode.kind === 'edit' && (
        <>
          <Button variant='ghost' onClick={() => setIsConfirmOpen(true)}>
            <span className='text-danger'>해지</span>
          </Button>
          <ConfirmDialog
            open={isConfirmOpen}
            onOpenChange={setIsConfirmOpen}
            title={`${withObjectParticle(mode.item.name)} 해지할까요?`}
            description='다음 결제일부터 기록하지 않아요. 이미 기록된 지출은 남아요.'
            confirmLabel='해지'
            confirmVariant='danger'
            onConfirm={() => void handleDelete()}
            isPending={isDeleting}
          />
        </>
      )}
    </form>
  );
}
