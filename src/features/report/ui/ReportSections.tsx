import type { ReactNode } from 'react';
import type { BudgetProgress } from '@/features/budget/budgetProgress';
import type { RecordEntryOf } from '@/features/records/schema/recordEntry';
import {
  RECORD_TYPE_CONFIG,
  type RecordType,
} from '@/features/records/schema/recordTypes';
import MeasureChart from '@/features/records/type/MeasureChart';
import {
  formatExpenseAmount,
  formatMeasurement,
  roundToOneDecimal,
} from '@/features/records/ui/recordPresentation';
import { RECORD_TYPE_STYLE } from '@/features/records/ui/recordTypeStyle';
import {
  summarizeBody,
  summarizeExpenses,
  summarizeReviews,
} from '@/features/records/ui/typeSummary';
import { formatMonthDotDay } from '@/shared/date/formatDisplayDate';
import type { PerfectDays } from '@/features/routines/progress';
import { ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { topReviews, type WorkoutBucket } from '../reportModel';

// 보고서의 타입별 카드 (시안 21b 화면 · 21c 인쇄용). 계산은 타입 상세 요약(typeSummary)·보고서 계산(reportModel)을 그대로 쓰고,
// 여기는 그리기만 한다. 인쇄할 때는 카드가 갈라지지 않게(break-inside-avoid) 2열로 놓인다 (ReportView)

// 분류 막대는 위에서 이만큼만 (나머지는 "그 밖의 분류"로 합쳐 한 줄)
const MAX_CATEGORY_ROWS = 5;
const TOP_REVIEW_COUNT = 3;

function Card({
  type,
  summary,
  children,
}: {
  type: RecordType;
  summary: string;
  children: ReactNode;
}) {
  const style = RECORD_TYPE_STYLE[type];
  const Icon = style.icon;
  return (
    <section
      aria-label={RECORD_TYPE_CONFIG[type].label}
      className='flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-card break-inside-avoid print:border print:border-border print:shadow-none'
    >
      {/* flex-wrap: 좁은 종이(아이폰 인쇄는 화면 폭에 가깝게 그린다)에서 큰 요약 숫자가 카드 밖으로 나가지 않고 다음 줄로 (2026-10-25 아이폰 확인 13) */}
      <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
        <span
          aria-hidden='true'
          className={`flex size-7 shrink-0 items-center justify-center rounded-md ${style.subtleBgClass} ${style.textClass}`}
        >
          <Icon size={16} strokeWidth={ICON_STROKE_WIDTH} />
        </span>
        <h2 className='flex-1 text-body font-semibold text-fg-primary'>
          {RECORD_TYPE_CONFIG[type].label}
        </h2>
        <span className='ml-auto text-body font-semibold whitespace-nowrap text-fg-primary tabular-nums'>
          {summary}
        </span>
      </div>
      {children}
    </section>
  );
}

function Empty() {
  return (
    <p className='text-body-sm text-fg-secondary'>이 기간에 기록이 없어요</p>
  );
}

// 가로 막대 한 줄 (분류·대상). 색만으로 값을 알리지 않게 금액·개수 글자를 옆에 둔다.
// 이름 칸 5.5rem: 가장 긴 고정 문구 "그 밖의 분류"가 잘리지 않는 너비 (직접 입력한 긴 분류만 …로 줄인다)
function BarRow({
  label,
  ratio,
  value,
  barClass,
}: {
  label: string;
  ratio: number;
  value: string;
  barClass: string;
}) {
  return (
    <div className='grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-2 text-body-sm tabular-nums'>
      <span className='truncate text-fg-secondary'>{label}</span>
      <div className='h-2 overflow-hidden rounded-full bg-surface-pressed'>
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${Math.max(2, Math.round(ratio * 100))}%` }}
        />
      </div>
      <span className='text-right text-fg-primary'>{value}</span>
    </div>
  );
}

export function ExpenseSection({
  entries,
  budget,
}: {
  entries: RecordEntryOf<'expense'>[];
  budget: BudgetProgress | null;
}) {
  const summary = summarizeExpenses(entries);
  const top = summary.categories.slice(0, MAX_CATEGORY_ROWS);
  const rest = summary.categories.slice(MAX_CATEGORY_ROWS);
  const restAmount = rest.reduce((sum, item) => sum + item.amount, 0);
  const rows =
    restAmount > 0
      ? [...top, { name: '그 밖의 분류', amount: restAmount }]
      : top;
  const max = Math.max(1, ...rows.map((row) => row.amount));
  const overNames =
    budget?.categories.filter((item) => item.isOver).map((item) => item.name) ??
    [];
  return (
    <Card type='expense' summary={formatExpenseAmount(summary.total)}>
      {entries.length === 0 ? (
        <Empty />
      ) : (
        <div className='flex flex-col gap-2'>
          {rows.map((row) => (
            <BarRow
              key={row.name}
              label={row.name}
              ratio={row.amount / max}
              value={formatExpenseAmount(row.amount)}
              barClass='bg-type-expense'
            />
          ))}
        </div>
      )}
      {/* 한 달 보고서이고 그 달 예산이 있을 때만 (시안 21c: "예산 600,000원 중 69% 사용 · 초과 분류: 식비, 카페") */}
      {budget?.total != null && budget.percent !== null && (
        <p className='text-caption text-fg-secondary tabular-nums'>
          {`예산 ${budget.total.toLocaleString('ko-KR')}원 중 ${budget.percent}% 사용`}
          {overNames.length > 0 && ` · 초과 분류: ${overNames.join(', ')}`}
        </p>
      )}
    </Card>
  );
}

export function WorkoutSection({
  entries,
  buckets,
}: {
  entries: RecordEntryOf<'workout'>[];
  buckets: WorkoutBucket[];
}) {
  const totalMinutes = entries.reduce(
    (sum, entry) => sum + entry.fields.minutes,
    0,
  );
  const max = Math.max(1, ...buckets.map((bucket) => bucket.minutes));
  return (
    <Card
      type='workout'
      summary={`${entries.length}회 · ${totalMinutes.toLocaleString('ko-KR')}분`}
    >
      {entries.length === 0 ? (
        <Empty />
      ) : (
        // 세로 막대: 높이 = 그 묶음의 시간 / 가장 긴 묶음. 0분은 얇은 선으로 (빈 칸과 "안 함"을 구분)
        <div
          className='flex h-32 items-end gap-2'
          role='list'
          aria-label='묶음별 운동 시간'
        >
          {buckets.map((bucket) => (
            <div
              key={bucket.label}
              role='listitem'
              className='flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1'
            >
              <span className='text-caption text-fg-secondary tabular-nums'>
                {bucket.minutes > 0 ? `${bucket.minutes}분` : '—'}
              </span>
              <div
                className={`w-full rounded-sm ${bucket.minutes > 0 ? 'bg-type-workout' : 'bg-surface-pressed'}`}
                style={{
                  height:
                    bucket.minutes > 0
                      ? `${Math.round((bucket.minutes / max) * 72)}px`
                      : '2px',
                }}
              />
              <span className='truncate text-caption text-fg-secondary'>
                {bucket.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function BodySection({ entries }: { entries: RecordEntryOf<'body'>[] }) {
  const { points } = summarizeBody(entries);
  const weights = points.weight;
  const first = weights[0];
  const last = weights[weights.length - 1];
  const change =
    first && last && weights.length > 1
      ? roundToOneDecimal(last.value - first.value)
      : null;
  const summary = last
    ? `${formatMeasurement(last.value, 'kg')}${change !== null ? ` (${change > 0 ? '+' : ''}${formatMeasurement(change, 'kg')})` : ''}`
    : `${entries.length}회`;
  return (
    <Card type='body' summary={summary}>
      {entries.length === 0 ? (
        <Empty />
      ) : (
        <>
          {weights.length > 0 && (
            <MeasureChart label='체중' unit='kg' points={weights} />
          )}
          {points.waist.length > 0 && (
            <MeasureChart label='허리둘레' unit='cm' points={points.waist} />
          )}
          {first && last && weights.length > 1 && (
            <p className='flex justify-between text-caption text-fg-secondary tabular-nums'>
              <span>{`${formatMonthDotDay(first.date)} · ${formatMeasurement(first.value, 'kg')}`}</span>
              <span>{`${formatMonthDotDay(last.date)} · ${formatMeasurement(last.value, 'kg')}`}</span>
            </p>
          )}
        </>
      )}
    </Card>
  );
}

export function ReviewSection({
  entries,
}: {
  entries: RecordEntryOf<'review'>[];
}) {
  const summary = summarizeReviews(entries);
  const kinds = summary.kinds.filter((kind) => kind.count > 0);
  return (
    <Card type='review' summary={`${summary.count}건`}>
      {entries.length === 0 ? (
        <Empty />
      ) : (
        <>
          <ul className='flex flex-col gap-1'>
            {topReviews(entries, TOP_REVIEW_COUNT).map((entry) => (
              <li
                key={entry.id}
                className='flex justify-between gap-2 text-body-sm tabular-nums'
              >
                <span className='truncate text-fg-primary'>{entry.title}</span>
                <span className='shrink-0 font-semibold text-fg-primary'>{`★ ${entry.fields.rating.toFixed(1)}`}</span>
              </li>
            ))}
          </ul>
          <p className='text-caption text-fg-secondary'>
            {kinds.map((kind) => `${kind.name} ${kind.count}`).join(' · ')}
          </p>
        </>
      )}
    </Card>
  );
}

// 루틴을 모두 해낸 날 (2026-10-25 사용자 결정: % 대신 "며칠 성공", 그날 루틴을 전부 해야 하루)
export function RoutineSection({ days }: { days: PerfectDays | null }) {
  const hasDays = days !== null && days.scheduledDays > 0;
  return (
    <Card type='routine' summary={hasDays ? `${days.perfectDays}일` : '—'}>
      {hasDays ? (
        <BarRow
          label='해낸 날'
          ratio={days.perfectDays / days.scheduledDays}
          value={`${days.perfectDays} / ${days.scheduledDays}일`}
          barClass='bg-type-routine'
        />
      ) : (
        <p className='text-body-sm text-fg-secondary'>
          이 기간에 해야 할 루틴이 없어요
        </p>
      )}
    </Card>
  );
}
