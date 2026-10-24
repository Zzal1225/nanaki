'use client';

// 'use client' 이유: 기기 사본에서 기간 기록을 읽고, 오늘(브라우저 시간대)·인쇄(window.print)가 브라우저에 있다
import { ChevronLeft, FileDown } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { getBudgetProgress } from '@/features/budget/budgetProgress';
import { useBudget } from '@/features/budget/hooks/useBudget';
import { useRecords } from '@/features/records/hooks/useRecords';
import type { RecordEntryOf } from '@/features/records/schema/recordEntry';
import type { RecordType } from '@/features/records/schema/recordTypes';
import {
  formatExpenseAmount,
  formatMeasurement,
  roundToOneDecimal,
} from '@/features/records/ui/recordPresentation';
import { summarizeBody } from '@/features/records/ui/typeSummary';
import { useRoutines } from '@/features/routines/hooks/useRoutines';
import { getAchievement } from '@/features/routines/progress';
import { formatDisplayDate } from '@/shared/date/formatDisplayDate';
import { useToday } from '@/shared/date/useToday';
import { DARK_CLASS_NAME } from '@/shared/theme/theme';
import Button from '@/shared/ui/Button';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import {
  REPORT_PATH,
  REPORT_TYPES,
  reportTitle,
  routineRange,
  singleMonthOf,
  workoutBuckets,
  type ReportQuery,
} from '../reportModel';
import {
  BodySection,
  ExpenseSection,
  ReviewSection,
  RoutineSection,
  WorkoutSection,
} from './ReportSections';

// 인쇄할 때는 앱 테마와 상관없이 흰 바탕 (시안 21c: "인쇄용은 라이트 토큰"). 다크 클래스를 잠깐 떼었다가 인쇄가 끝나면 되돌린다.
// 브라우저 메뉴의 인쇄(⌘P)로 들어와도 같게 beforeprint/afterprint로 한다
function useLightWhilePrinting() {
  useEffect(() => {
    const root = document.documentElement;
    let wasDark = false;
    const before = () => {
      wasDark = root.classList.contains(DARK_CLASS_NAME);
      root.classList.remove(DARK_CLASS_NAME);
    };
    const after = () => {
      if (wasDark) root.classList.add(DARK_CLASS_NAME);
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);
}

function ofType<T extends RecordType>(
  entries: readonly { type: RecordType }[],
  type: T,
): RecordEntryOf<T>[] {
  return entries.filter((entry) => entry.type === type) as RecordEntryOf<T>[];
}

// 보고서 결과 (step4 40, 시안 21b 화면 + 21c 인쇄용 A4). 기기 사본으로 그려 오프라인에서도 열린다 (예산 줄만 받아 본 달이 있을 때).
// "PDF로 저장" = 브라우저 인쇄 (2026-10-24 사용자 결정: 라이브러리 없이 글자가 선명한 PDF. 아이폰은 인쇄 → 공유 → 파일에 저장).
// 인쇄에는 data-print-root 안만 나온다 (globals.css @media print): 앱 틀(사이드바·하단 탭·+ 버튼)은 손대지 않고 숨긴다
export default function ReportView({ query }: { query: ReportQuery }) {
  useLightWhilePrinting();
  const today = useToday();
  const range = { from: query.from, to: query.to };
  const records = useRecords(range);
  const routines = useRoutines();
  const month = singleMonthOf(range);
  const budget = useBudget(query.types.includes('expense') ? month : null);
  const entries = (records.data ?? []).filter((entry) =>
    query.types.includes(entry.type),
  );
  const title = reportTitle(range);

  const expenses = ofType(entries, 'expense');
  const workouts = ofType(entries, 'workout');
  const bodies = ofType(entries, 'body');
  const reviews = ofType(entries, 'review');
  const checks = ofType(entries, 'routine');
  const routineDays = today ? routineRange(range, today) : null;
  const achievement =
    routineDays && routines.data
      ? getAchievement(routines.data, checks, routineDays)
      : null;
  const budgetProgress =
    budget.data && today
      ? getBudgetProgress(budget.data.budget, expenses, today)
      : null;

  // 인쇄용 위 요약 숫자 (시안 21c). 포함한 타입만
  const weights = summarizeBody(bodies).points.weight;
  const weightChange =
    weights.length > 1
      ? roundToOneDecimal(
          (weights[weights.length - 1]?.value ?? 0) - (weights[0]?.value ?? 0),
        )
      : null;
  const kpis = [
    query.types.includes('expense') && {
      label: '가계부 지출',
      value: formatExpenseAmount(
        expenses.reduce((sum, entry) => sum + entry.fields.amount, 0),
      ),
    },
    query.types.includes('workout') && {
      label: '운동',
      value: `${workouts.length}회`,
    },
    query.types.includes('body') && {
      label: '체중 변화',
      value:
        weightChange === null
          ? '—'
          : `${weightChange > 0 ? '+' : ''}${formatMeasurement(weightChange, 'kg')}`,
    },
    query.types.includes('review') && {
      label: '후기',
      value: `${reviews.length}건`,
    },
    query.types.includes('routine') && {
      label: '루틴 달성률',
      value: achievement?.rate == null ? '—' : `${achievement.rate}%`,
    },
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  const sections: Record<RecordType, React.ReactNode> = {
    expense: <ExpenseSection entries={expenses} budget={budgetProgress} />,
    review: <ReviewSection entries={reviews} />,
    workout: (
      <WorkoutSection
        entries={workouts}
        buckets={workoutBuckets(workouts, range)}
      />
    ),
    body: <BodySection entries={bodies} />,
    routine: <RoutineSection achievement={achievement} />,
  };

  return (
    <div className='mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pb-6 md:px-6 lg:max-w-3xl print:max-w-none print:p-0'>
      <div className='sticky top-0 z-20 -mx-4 flex h-14 items-center bg-bg px-1 md:-mx-6 md:px-3 lg:mt-4 print:hidden'>
        <Link
          href={REPORT_PATH}
          aria-label='기간 다시 고르기'
          className='inline-flex size-11 items-center justify-center rounded-md text-fg-primary hover:bg-surface-hover active:bg-surface-pressed'
        >
          <ChevronLeft
            aria-hidden='true'
            size={ICON_SIZE.lg}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </Link>
        <h1 className='ml-1 flex-1 text-title text-fg-primary'>{title}</h1>
      </div>

      <div data-print-root className='flex flex-col gap-4'>
        {/* 인쇄용 머리 (시안 21c): 로고·제목 / 기간·만든 날 */}
        <header className='hidden items-end justify-between border-b border-border pb-3 print:flex'>
          <div className='flex flex-col'>
            <span className='text-body-sm font-semibold text-accent'>
              nanaki
            </span>
            <span className='text-title text-fg-primary'>{title}</span>
          </div>
          <div className='text-right text-caption text-fg-secondary tabular-nums'>
            <div>{`${formatDisplayDate(range.from)} – ${formatDisplayDate(range.to)}`}</div>
            {today && <div>{`만든 날 ${formatDisplayDate(today)}`}</div>}
          </div>
        </header>

        <p className='text-body-sm text-fg-secondary tabular-nums print:hidden'>
          {`${formatDisplayDate(range.from)} – ${formatDisplayDate(range.to)} · 기록 ${entries.length}개`}
        </p>

        {/* 고른 타입 수(1~5)만큼 한 줄에 같은 너비로 */}
        <div className='hidden auto-cols-fr grid-flow-col gap-2 print:grid'>
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className='rounded-md border border-border p-3'
            >
              <div className='text-caption text-fg-secondary'>{kpi.label}</div>
              {/* 한 줄로: A4에 5칸이면 칸이 좁아 제목 크기(20px)의 금액이 "-197,200 / 원"으로 꺾였다 */}
              <div className='text-body font-bold whitespace-nowrap text-fg-primary tabular-nums'>
                {kpi.value}
              </div>
            </div>
          ))}
        </div>

        {records.isPending ? (
          <div
            aria-busy='true'
            className='h-40 animate-pulse rounded-lg bg-surface-hover'
          />
        ) : (
          // 화면은 한 줄씩, 인쇄(A4)는 2열 (시안 21c)
          <div className='grid gap-4 lg:grid-cols-2 print:grid-cols-2 print:gap-3'>
            {REPORT_TYPES.filter((type) => query.types.includes(type)).map(
              (type) => (
                <div key={type} className='contents'>
                  {sections[type]}
                </div>
              ),
            )}
          </div>
        )}

        <footer className='hidden justify-between border-t border-border pt-2 text-caption text-fg-secondary print:flex'>
          <span>나는 나를 키운다 · nanaki</span>
        </footer>
      </div>

      <Button onClick={() => window.print()} className='print:hidden'>
        {/* Button은 내용을 span 하나로 감싸고, 아이콘(svg)은 블록이라 그대로 두면 글자 위로 쌓인다 */}
        <span className='inline-flex items-center gap-2'>
          <FileDown
            aria-hidden='true'
            size={ICON_SIZE.md}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          PDF로 저장
        </span>
      </Button>
      <p className='text-center text-caption text-fg-secondary print:hidden'>
        인쇄 창에서 &ldquo;PDF로 저장&rdquo;을 고르세요. 사진은 보고서에 넣지
        않아요
      </p>
    </div>
  );
}
