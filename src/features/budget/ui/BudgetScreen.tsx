'use client';

// 'use client' 이유: 예산·기록을 브라우저에서 불러오고(기기 사본), 오늘·연결 상태도 브라우저에서만 안다
import { ChevronLeft, CloudOff, Info } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useRecordsOfType } from '@/features/records/hooks/useRecordsOfType';
import { EXPENSE_CATEGORIES } from '@/features/records/schema/expense';
import type { RecordEntryOf } from '@/features/records/schema/recordEntry';
import MonthNav from '@/features/records/type/MonthNav';
import {
  formatMonthLabel,
  getMonthRangeOf,
  toMonthString,
} from '@/shared/date/month';
import { useToday } from '@/shared/date/useToday';
import { useOnlineStatus } from '@/shared/network/useOnlineStatus';
import Button from '@/shared/ui/Button';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { getBudgetProgress, sortCategoryNames } from '../budgetProgress';
import { budgetBackHref, budgetHref } from '../budgetRoutes';
import { inheritedBudgetNotice } from '../budgetText';
import { useBudget, useSaveBudget } from '../hooks/useBudget';
import FixedExpenseSection from '@/features/fixedExpenses/ui/FixedExpenseSection';
import CategoryBudgetList from './CategoryBudgetList';
import CategoryBudgetSheet from './CategoryBudgetSheet';
import TotalBudgetCard from './TotalBudgetCard';
import TotalBudgetSheet from './TotalBudgetSheet';

type BudgetScreenProps = {
  // 주소의 ?month=. 없거나 틀리면 null → 이번 달
  month: string | null;
};

type OpenSheet = 'total' | 'categories' | null;

const NOTICE_CLASS =
  'flex items-start gap-2 rounded-md bg-surface-hover px-3 py-2 text-body-sm text-fg-primary';

// 예산 · 고정지출 화면 (시안 18). 위는 그 달 예산, 아래는 고정지출(이번 달을 볼 때만).
// 달마다 따로라 타입 화면처럼 ‹ 달 › 로 다른 달을 보고 고친다 (2026-10-23 사용자 결정: 지난달도 수정)
export default function BudgetScreen({ month: monthParam }: BudgetScreenProps) {
  const today = useToday();
  const currentMonth = today ? toMonthString(today) : null;
  const month = monthParam ?? currentMonth;
  const budget = useBudget(month);
  // 그 달 지출. 가계부 화면에서 들어왔다면 같은 쿼리 키라 캐시에서 바로 나온다
  const records = useRecordsOfType(
    'expense',
    month ? getMonthRangeOf(month) : null,
  );
  const save = useSaveBudget();
  const isOnline = useOnlineStatus();
  // 시트 열림은 이 화면 안에서만 쓰는 상태라 주소에 두지 않는다 (새로고침하면 닫혀도 된다)
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);

  function frame(children: ReactNode) {
    return (
      <div className='mx-auto flex w-full max-w-xl flex-col pb-6'>
        {/* 타입 화면과 같은 머리 줄: 스크롤해도 뒤로·달 이동이 위에 붙어 있다 */}
        <div className='sticky top-0 z-20 flex h-14 items-center gap-1 bg-bg px-1 md:px-3 lg:mt-4'>
          <Link
            href={month ? budgetBackHref(month) : '/records/type/expense'}
            aria-label='가계부 화면으로 돌아가기'
            className='inline-flex size-11 items-center justify-center rounded-md text-fg-primary hover:bg-surface-hover active:bg-surface-pressed'
          >
            <ChevronLeft
              aria-hidden='true'
              size={ICON_SIZE.lg}
              strokeWidth={ICON_STROKE_WIDTH}
            />
          </Link>
          <h1 className='ml-1 text-title text-fg-primary'>예산 · 고정지출</h1>
          <span className='flex-1' />
          {month && currentMonth && (
            <MonthNav
              month={month}
              currentMonth={currentMonth}
              hrefOf={budgetHref}
            />
          )}
        </div>
        {children}
      </div>
    );
  }

  if (budget.isError || records.isError) {
    return frame(
      <div
        role='alert'
        className='mx-4 mt-4 flex flex-col items-start gap-3 md:mx-6'
      >
        <p className='text-body text-fg-primary'>
          예산을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
        <Button
          variant='secondary'
          onClick={() => {
            if (budget.isError) void budget.refetch();
            if (records.isError) void records.refetch();
          }}
        >
          다시 시도
        </Button>
      </div>,
    );
  }

  if (
    budget.isPending ||
    records.isPending ||
    !today ||
    !month ||
    !currentMonth
  ) {
    return frame(
      <div aria-busy='true' className='mx-4 mt-2 flex flex-col gap-6 md:mx-6'>
        <div className='h-40 animate-pulse rounded-lg bg-surface-hover' />
        <div className='h-48 animate-pulse rounded-lg bg-surface-hover' />
      </div>,
    );
  }

  const view = budget.data;
  // 조회가 이미 가계부만 거르지만 반환 타입은 모든 타입의 유니온이라, 타입 가드로 좁힌다 (as로 우기지 않고)
  const expenses = records.data.filter(
    (entry): entry is RecordEntryOf<'expense'> => entry.type === 'expense',
  );
  const progress = getBudgetProgress(view.budget, expenses, today);
  const monthLabel = formatMonthLabel(month, currentMonth);
  const inheritedFrom =
    view.sourceMonth !== null && view.sourceMonth !== month
      ? view.sourceMonth
      : null;
  // 편집 칸: 기본 분류는 늘 + 예산을 정한 분류 + 이 달 돈을 쓴 분류 (직접 입력한 분류도 예산을 둘 수 있게)
  const categoryNames = sortCategoryNames([
    ...EXPENSE_CATEGORIES,
    ...Object.keys(view.budget.categories),
    ...progress.unbudgeted.map((category) => category.name),
  ]);

  return frame(
    <>
      <div className='mx-4 mt-2 flex flex-col gap-6 md:mx-6'>
        {(inheritedFrom || !isOnline) && (
          <div className='flex flex-col gap-2'>
            {inheritedFrom && (
              <p className={NOTICE_CLASS}>
                <Info
                  aria-hidden='true'
                  size={ICON_SIZE.sm}
                  strokeWidth={ICON_STROKE_WIDTH}
                  className='mt-0.5 shrink-0 text-fg-secondary'
                />
                {inheritedBudgetNotice(inheritedFrom, month, currentMonth)}
              </p>
            )}
            {/* 예산 저장은 온라인 전용(budgetStore). 보기는 기기 사본으로 된다 */}
            {!isOnline && (
              <p className={NOTICE_CLASS}>
                <CloudOff
                  aria-hidden='true'
                  size={ICON_SIZE.sm}
                  strokeWidth={ICON_STROKE_WIDTH}
                  className='mt-0.5 shrink-0 text-fg-secondary'
                />
                오프라인이에요. 연결되면 예산을 바꿀 수 있어요.
              </p>
            )}
          </div>
        )}

        <TotalBudgetCard
          monthLabel={monthLabel}
          progress={progress}
          canEdit={isOnline}
          onEdit={() => setOpenSheet('total')}
        />
        <CategoryBudgetList
          progress={progress}
          canEdit={isOnline}
          onEdit={() => setOpenSheet('categories')}
        />
        {/* 고정지출은 지금의 규칙이라 이번 달을 볼 때만 (2026-10-23 사용자 결정) */}
        {month === currentMonth && (
          <FixedExpenseSection today={today} canEdit={isOnline} />
        )}
      </div>

      <TotalBudgetSheet
        open={openSheet === 'total'}
        onOpenChange={(open) => setOpenSheet(open ? 'total' : null)}
        monthLabel={monthLabel}
        budget={view.budget}
        onSave={save.mutateAsync}
      />
      <CategoryBudgetSheet
        open={openSheet === 'categories'}
        onOpenChange={(open) => setOpenSheet(open ? 'categories' : null)}
        budget={view.budget}
        categoryNames={categoryNames}
        onSave={save.mutateAsync}
      />
    </>,
  );
}
