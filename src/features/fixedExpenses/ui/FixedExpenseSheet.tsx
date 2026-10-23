'use client';

// 'use client' 이유: 시트 안 입력값·저장 중 상태·해지 확인 창을 들고 있다
import { useState, type FormEvent } from 'react';
import {
  formatNumberInput,
  parseNumberInput,
} from '@/features/records/form/inputValue';
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from '@/features/records/schema/expense';
import { withObjectParticle } from '@/shared/text/withObjectParticle';
import Button from '@/shared/ui/Button';
import ChipSelect from '@/shared/ui/ChipSelect';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import FieldError from '@/shared/ui/FieldError';
import Sheet from '@/shared/ui/Sheet';
import TextField from '@/shared/ui/TextField';
import {
  fixedExpenseInputSchema,
  MAX_FIXED_EXPENSE_NAME_LENGTH,
  type FixedExpense,
  type FixedExpenseInput,
} from '../schema/fixedExpense';

type FixedExpenseSheetProps = {
  // 고칠 고정지출. null이면 닫힘
  item: FixedExpense | null;
  onClose: () => void;
  onUpdate: (id: string, input: FixedExpenseInput) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
};

const SAVE_FAILED_MESSAGE =
  '저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.';
const DELETE_FAILED_MESSAGE =
  '해지하지 못했어요. 연결을 확인하고 다시 시도해 주세요.';

// 고정지출 수정 시트 (모바일 바텀시트 / PC 오른쪽 패널, 공통 Sheet). 해지(삭제)도 여기서.
// 만들기는 가계부 쓰기의 "고정지출" 체크에서만 (2026-10-23 사용자 결정: 입력 화면을 두 개 두지 않는다)
export default function FixedExpenseSheet(props: FixedExpenseSheetProps) {
  const { item, onClose } = props;
  return (
    <Sheet
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title='고정지출 수정'
    >
      {/* 열 때마다 새로 그려 입력칸을 지금 값으로 채운다 (예산 시트와 같은 방식). key: 다른 줄을 열면 새 초안 */}
      {item && <FixedExpenseForm key={item.id} {...props} item={item} />}
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

type FieldName = keyof Draft;

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
  item,
  onClose,
  onUpdate,
  onDelete,
}: Omit<FixedExpenseSheetProps, 'item'> & { item: FixedExpense }) {
  const [draft, setDraft] = useState<Draft>({
    name: item.name,
    amount: item.amount,
    category: item.category,
    paymentMethod: item.paymentMethod,
    day: item.schedule.day,
  });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [saveError, setSaveError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function update<K extends FieldName>(name: K, value: Draft[K]) {
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
      await onUpdate(item.id, result.data);
      onClose();
    } catch {
      // 시트를 닫지 않는다: 입력한 값이 남아 있어야 연결이 돌아왔을 때 그대로 다시 누른다
      setSaveError(SAVE_FAILED_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await onDelete(item.id);
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
          31일이 없는 달은 말일에 기록돼요. 이번 달에 이미 기록했으면 다음
          달부터 바뀐 날짜로 기록돼요
        </p>
      </div>
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
      <Button variant='ghost' onClick={() => setIsConfirmOpen(true)}>
        <span className='text-danger'>해지</span>
      </Button>
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={`${withObjectParticle(item.name)} 해지할까요?`}
        description='다음 결제일부터 기록하지 않아요. 이미 기록된 지출은 남아요.'
        confirmLabel='해지'
        confirmVariant='danger'
        onConfirm={() => void handleDelete()}
        isPending={isDeleting}
      />
    </form>
  );
}
