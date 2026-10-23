'use client';

// 'use client' 이유: 예산을 브라우저에서 불러오고(기기 사본 포함), 남은 날 계산에 오늘이 필요하다
import Link from 'next/link';
import type { RecordEntryOf } from '@/features/records/schema/recordEntry';
import { useToday } from '@/shared/date/useToday';
import { getBudgetProgress } from '../budgetProgress';
import { budgetHref } from '../budgetRoutes';
import { useBudget } from '../hooks/useBudget';
import { hasAnyBudget } from '../schema/budget';
import BudgetSummaryLine from './BudgetSummaryLine';

type ExpenseBudgetSectionProps = {
  // 그 달 가계부 기록 (타입 화면이 이미 불러온 것을 그대로 받는다: 같은 기록을 두 번 부르지 않게)
  entries: RecordEntryOf<'expense'>[];
  month: string;
};

// 가계부 요약 카드 안의 예산 줄: 예산 조회 + 진행률 계산 → 표시는 BudgetSummaryLine (훅이 조회, 컴포넌트는 표시)
export default function ExpenseBudgetSection({
  entries,
  month,
}: ExpenseBudgetSectionProps) {
  const today = useToday();
  const budget = useBudget(month);
  const href = budgetHref(month);

  // 불러오는 동안 같은 높이의 자리를 둔다: 예산 줄이 나중에 끼어들며 아래 분류 목록이 밀리지 않게
  if (budget.isPending || !today) {
    return (
      <div
        aria-busy='true'
        className='h-[60px] animate-pulse rounded-md bg-surface-hover'
      />
    );
  }

  // 사본도 없고 서버에도 못 닿은 경우. 카드 전체를 실패로 만들 일은 아니라서 예산 화면(다시 시도가 있는 곳)으로 보내는 줄만 남긴다
  if (budget.isError) {
    return (
      <Link
        href={href}
        className='-mx-2 flex min-h-11 items-center rounded-md px-2 text-body-sm text-fg-secondary hover:bg-surface-hover'
      >
        예산을 불러오지 못했어요. 눌러서 다시 보기
      </Link>
    );
  }

  const view = budget.data;
  const progress =
    view.sourceMonth !== null && hasAnyBudget(view.budget)
      ? getBudgetProgress(view.budget, entries, today)
      : null;
  return <BudgetSummaryLine href={href} progress={progress} />;
}
