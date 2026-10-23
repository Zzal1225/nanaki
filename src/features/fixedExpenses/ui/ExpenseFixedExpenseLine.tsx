'use client';

// 'use client' 이유: 고정지출을 브라우저에서 불러오고(기기 사본), 이번 달인지 알려면 오늘이 필요하다
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { formatExpenseAmount } from '@/features/records/ui/recordPresentation';
import { toMonthString } from '@/shared/date/month';
import { useToday } from '@/shared/date/useToday';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { sumFixedExpenses } from '../fixedExpenseStatus';
import { useFixedExpenses } from '../hooks/useFixedExpenses';

type ExpenseFixedExpenseLineProps = {
  // 가계부 화면이 보는 달 'YYYY-MM'
  month: string;
};

// 가계부 요약 카드의 "고정지출 3개 · 매달 -170,500원 ›" (고정지출 화면의 입구, 2026-10-23 사용자 결정).
// 이번 달을 볼 때만: 고정지출은 지금의 규칙이라 지난달 화면에 붙이면 그달 일처럼 읽힌다.
// 없거나 못 불러오면 그리지 않는다: 만들기는 가계부 쓰기의 체크라, 빈 입구를 두지 않는다 (CLAUDE.md: 쓸 수 없는 것은 숨김)
export default function ExpenseFixedExpenseLine({
  month,
}: ExpenseFixedExpenseLineProps) {
  const today = useToday();
  const fixedExpenses = useFixedExpenses();
  if (!today || month !== toMonthString(today)) return null;
  const items = fixedExpenses.data ?? [];
  if (items.length === 0) return null;

  return (
    <Link
      href='/fixed-expenses'
      className='-mx-2 flex min-h-11 items-center gap-2 rounded-md px-2 text-body-sm text-fg-primary tabular-nums hover:bg-surface-hover active:bg-surface-pressed'
    >
      <span className='flex-1'>
        고정지출 {items.length}개
        <span className='text-fg-secondary'>
          {' '}
          · 매달 {formatExpenseAmount(sumFixedExpenses(items))}
        </span>
      </span>
      <ChevronRight
        aria-hidden='true'
        size={ICON_SIZE.sm}
        strokeWidth={ICON_STROKE_WIDTH}
        className='shrink-0 text-fg-secondary'
      />
    </Link>
  );
}
