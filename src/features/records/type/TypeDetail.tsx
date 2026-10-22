'use client';

// 'use client' 이유: 기록을 브라우저에서 불러오고, 오늘(이번 달)도 브라우저에서만 안다
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { formatShortDate } from '@/shared/date/formatDisplayDate';
import {
  formatMonthLabel,
  getMonthRangeOf,
  toMonthString,
} from '@/shared/date/month';
import { useToday } from '@/shared/date/useToday';
import Button from '@/shared/ui/Button';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { useRecordsOfType } from '../hooks/useRecordsOfType';
import { usePendingRecordIds } from '../hooks/usePendingRecordIds';
import RecentRecordItem from '../overview/RecentRecordItem';
import { RECORD_TYPE_CONFIG, type RecordType } from '../schema/recordTypes';
import { getListTitle, getListValue } from '../ui/recordPresentation';
import { RECORD_TYPE_STYLE } from '../ui/recordTypeStyle';
import MonthNav from './MonthNav';
import { renderTypeSummary } from './typeSummaryCards';

type TypeDetailProps = {
  type: RecordType;
  // 주소의 ?month=. 없거나 틀리면 null → 이번 달
  month: string | null;
};

// 타입 상세 (시안 "타입 상세 공통 틀"): 헤더(타입 + 달 이동) → 요약 카드 1개 → 그 달의 기록 목록.
// 요약 카드 안쪽만 타입마다 다르고(typeSummaryCards), 나머지 틀은 모든 타입이 같다
export default function TypeDetail({
  type,
  month: monthParam,
}: TypeDetailProps) {
  const today = useToday();
  const currentMonth = today ? toMonthString(today) : null;
  const month = monthParam ?? currentMonth;
  const range = month ? getMonthRangeOf(month) : null;
  const records = useRecordsOfType(type, range);
  // 아직 서버에 보내지 않은 기록에 구름 아이콘 (시안 15a)
  const pendingIds = usePendingRecordIds();

  const config = RECORD_TYPE_CONFIG[type];
  const style = RECORD_TYPE_STYLE[type];
  const TypeIcon = style.icon;
  const entries = records.data ?? [];

  return (
    <div className='mx-auto flex w-full max-w-xl flex-col pb-6'>
      <div className='flex h-14 items-center gap-1 px-1 md:px-3 lg:mt-4'>
        <Link
          href='/records'
          aria-label='기록 탭으로 돌아가기'
          // PC는 목록이 옆에 있어서 뒤로 버튼이 필요 없다
          className='inline-flex size-11 items-center justify-center rounded-md text-fg-primary hover:bg-surface-hover active:bg-surface-pressed lg:hidden'
        >
          <ChevronLeft
            aria-hidden='true'
            size={ICON_SIZE.lg}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </Link>
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-md ${style.subtleBgClass} ${style.textClass}`}
        >
          <TypeIcon
            aria-hidden='true'
            size={18}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </span>
        <h1 className='ml-1 text-title text-fg-primary'>{config.label}</h1>
        <span className='flex-1' />
        {month && currentMonth && (
          <MonthNav
            month={month}
            currentMonth={currentMonth}
            hrefOf={(target) => `/records/type/${type}?month=${target}`}
          />
        )}
      </div>

      {records.isError ? (
        <div
          role='alert'
          className='mx-4 mt-4 flex flex-col items-start gap-3 md:mx-6'
        >
          <p className='text-body text-fg-primary'>
            기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
          <Button variant='secondary' onClick={() => void records.refetch()}>
            다시 시도
          </Button>
        </div>
      ) : records.isPending || !month || !currentMonth ? (
        <div aria-busy='true' className='mx-4 mt-2 flex flex-col gap-2 md:mx-6'>
          <div className='h-40 animate-pulse rounded-lg bg-surface-hover' />
          <div className='h-17 animate-pulse rounded-lg bg-surface-hover' />
        </div>
      ) : (
        <>
          <section
            aria-label={`${formatMonthLabel(month, currentMonth)} 요약`}
            className='mx-4 mt-2 flex flex-col gap-4 rounded-lg bg-surface p-4 shadow-card md:mx-6'
          >
            {renderTypeSummary(
              type,
              entries,
              formatMonthLabel(month, currentMonth),
              month,
            )}
          </section>

          {entries.length === 0 ? (
            <p className='px-4 py-8 text-center text-body-sm text-fg-secondary md:px-6'>
              이 달에는 기록이 없어요
            </p>
          ) : (
            <ul className='flex flex-col gap-2 px-4 py-4 md:px-6'>
              {entries.map((entry) => (
                <li key={entry.id}>
                  <RecentRecordItem
                    type={entry.type}
                    title={getListTitle(entry)}
                    subtitle={formatShortDate(entry.occurredAt)}
                    value={getListValue(entry)}
                    href={`/records/${entry.id}`}
                    isPending={pendingIds.has(entry.id)}
                    isSelected={false}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
