'use client';

// 'use client' 이유: 체크 상태와 연결 상태를 들고, 저장 뒤 서버에 고정지출을 넣는다
import { useState } from 'react';
import RecordForm from '@/features/records/form/RecordForm';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import { toLocalDateString } from '@/shared/date/toLocalDateString';
import { useOnlineStatus } from '@/shared/network/useOnlineStatus';
import { useToastStore } from '@/shared/toast/toastStore';
import { Check } from 'lucide-react';
import { Checkbox } from 'radix-ui';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { useCreateFixedExpense } from '../hooks/useFixedExpenses';
import type { FixedExpenseInput } from '../schema/fixedExpense';

type ExpenseCreateFormProps = {
  date?: string;
  doneHref?: string;
};

// 가계부 쓰기 + 금액 옆 "고정지출" 체크 (2026-10-23 사용자 결정: 예산 설정과 고정지출을 나누고, 만들기는 가계부 쓰기에서).
// 체크하고 저장하면: 이 기록은 평소처럼 저장되고(기기 먼저 → 대기열), 같은 내용의 고정지출 규칙이 생긴다.
// 매달 이 기록 날짜의 "일"에 서버가 같은 기록을 만든다. 이번 달 몫은 이 기록이라 서버가 이번 달에는 다시 만들지 않는다(recordedOn).
// 폼(RecordForm)은 고정지출을 모른다: 금액 칸 옆 자리(fieldAddon)와 저장 뒤 할 일(onCreated)만 빌려 쓴다
export default function ExpenseCreateForm({
  date,
  doneHref,
}: ExpenseCreateFormProps) {
  const [isFixed, setIsFixed] = useState(false);
  // 고정지출 규칙은 서버에 있어야 뜻이 있어(서버가 그날 기록) 온라인 전용. 오프라인이면 체크를 막는다 (기록 자체는 오프라인에서도 저장된다)
  const isOnline = useOnlineStatus();
  const createFixedExpense = useCreateFixedExpense();
  const showToast = useToastStore((state) => state.showToast);

  // 기록은 이미 저장됐다. 여기서 실패해도 기록을 되돌리지 않고 알리기만 한다 (오류를 던지면 폼이 저장 화면에 멈춘다)
  async function handleCreated(entry: RecordEntry) {
    if (!isFixed || entry.type !== 'expense') return;
    const day = Number(entry.occurredAt.slice(-2));
    const input: FixedExpenseInput = {
      name: entry.title,
      amount: entry.fields.amount,
      category: entry.fields.category,
      ...(entry.fields.paymentMethod
        ? { paymentMethod: entry.fields.paymentMethod }
        : {}),
      schedule: { kind: 'monthly', day },
    };
    try {
      await createFixedExpense.mutateAsync({
        input,
        today: toLocalDateString(new Date()),
        recordedOn: entry.occurredAt,
      });
      showToast({ message: `매달 ${day}일에 자동으로 기록돼요` });
    } catch {
      showToast({
        message: '기록은 저장했지만 고정지출로 등록하지 못했어요',
        tone: 'error',
      });
    }
  }

  return (
    <RecordForm
      mode='create'
      type='expense'
      date={date}
      doneHref={doneHref}
      fieldAddon={{
        name: 'amount',
        node: (
          <FixedExpenseToggle
            checked={isFixed && isOnline}
            disabled={!isOnline}
            onCheckedChange={setIsFixed}
          />
        ),
      }}
      onCreated={handleCreated}
    />
  );
}

type FixedExpenseToggleProps = {
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
};

// 금액 칸 옆의 "고정지출" 칸 (2026-10-23 사용자: 금액 칸과 나란히, 더 작게).
// 공용 Checkbox(네모 22px + 글자)를 쓰지 않은 이유: 실제로 누르는 곳이 22px이라 터치 44px 규칙에 걸리고,
// 금액 입력칸(48px)과 높이가 달라 한 줄로 보이지 않는다. 칸 전체가 체크박스(Radix)라 화면 읽기 프로그램에는 "고정지출, 체크박스"로 읽힌다
function FixedExpenseToggle({
  checked,
  disabled,
  onCheckedChange,
}: FixedExpenseToggleProps) {
  return (
    <Checkbox.Root
      checked={checked}
      disabled={disabled}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      className='flex h-12 items-center gap-2 rounded-md border border-border bg-surface px-3 text-body-sm font-medium text-fg-primary enabled:hover:bg-surface-hover disabled:text-fg-disabled data-[state=checked]:border-accent data-[state=checked]:ring-1 data-[state=checked]:ring-accent'
    >
      {/* 체크 상태는 테두리 색만이 아니라 네모 안 표시로도 (색만으로 알리지 않음) */}
      <span
        aria-hidden='true'
        className='flex size-5 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-fg-secondary in-data-[state=checked]:border-accent in-data-[state=checked]:bg-accent in-data-[state=checked]:text-accent-foreground'
      >
        <Checkbox.Indicator>
          <Check size={ICON_SIZE.sm} strokeWidth={ICON_STROKE_WIDTH} />
        </Checkbox.Indicator>
      </span>
      고정지출
    </Checkbox.Root>
  );
}
