'use client';

// 'use client' 이유: 기록을 브라우저에서 불러온다(TanStack Query). step2에서 오프라인(IndexedDB)으로 바꿀 자리라 클라이언트 중심
import { formatShortDate } from '@/shared/date/formatDisplayDate';
import { getMonthRange } from '@/shared/date/monthRange';
import { fromLocalDateString } from '@/shared/date/toLocalDateString';
import { useToday } from '@/shared/date/useToday';
import Button from '@/shared/ui/Button';
import { RECORD_TYPE_ORDER } from '../entry/newRecordMenu';
import { useRecentRecords } from '../hooks/useRecentRecords';
import { useRecords } from '../hooks/useRecords';
import { RECORD_TYPE_CONFIG } from '../schema/recordTypes';
import {
  getListTitle,
  getListValue,
  getMonthMetric,
  getMonthValue,
} from '../ui/recordPresentation';
import MonthSummaryCard from './MonthSummaryCard';
import RecentRecordItem from './RecentRecordItem';
import RecordsEmptyState from './RecordsEmptyState';

// 시안은 3개를 보여 준다. 화면 한 장을 채우고도 남는 정도로 넉넉히, 전체 목록은 타입 상세(13c)에서
export const RECENT_RECORD_LIMIT = 20;

// 기록 탭 첫 화면: 이번 달 타입 카드 + 최근 기록 (시안 7번).
// 조회는 훅이, 값 계산은 recordPresentation이, 모양은 카드·목록 컴포넌트가 맡는다
export default function RecordsOverview() {
  // 오늘은 브라우저에서만 안다 (미리 그리기에서는 null → 카드 자리만 보이고 조회도 미룬다)
  const today = useToday();
  const month = today ? getMonthRange(fromLocalDateString(today)) : null;
  const monthRecords = useRecords(month);
  const recentRecords = useRecentRecords(RECENT_RECORD_LIMIT);

  const isPending = monthRecords.isPending || recentRecords.isPending;
  const isError = monthRecords.isError || recentRecords.isError;
  const monthEntries = monthRecords.data ?? [];
  const recentEntries = recentRecords.data ?? [];
  const hasNoRecords = !isPending && !isError && recentEntries.length === 0;

  return (
    <div className='mx-auto flex w-full max-w-xl flex-col pb-6'>
      <h1 className='px-4 pt-6 pb-2 text-title-lg text-fg-primary md:px-6'>
        기록
      </h1>

      {isError ? (
        <div
          role='alert'
          className='mx-4 mt-4 flex flex-col items-start gap-3 md:mx-6'
        >
          <p className='text-body text-fg-primary'>
            기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
          <Button
            variant='secondary'
            onClick={() => {
              void monthRecords.refetch();
              void recentRecords.refetch();
            }}
          >
            다시 시도
          </Button>
        </div>
      ) : (
        <>
          <section
            aria-label='이번 달 요약'
            // 불러오는 중에는 숫자 대신 회색 자리만. 스크린 리더에는 "불러오는 중"을 알린다
            aria-busy={isPending}
            className='grid grid-cols-2 gap-2 px-4 py-4 md:px-6'
          >
            {RECORD_TYPE_ORDER.map((type, index) => {
              const isLast = index === RECORD_TYPE_ORDER.length - 1;
              // 시안: 첫 카드는 한 줄 전체, 나머지가 홀수 개면 마지막 카드도 한 줄 전체
              const isWide =
                index === 0 ||
                ((RECORD_TYPE_ORDER.length - 1) % 2 === 1 && isLast);
              return isPending ? (
                <div
                  key={type}
                  className={`h-[90px] animate-pulse rounded-lg bg-surface-hover ${isWide ? 'col-span-2' : ''}`}
                />
              ) : (
                <MonthSummaryCard
                  key={type}
                  type={type}
                  metric={getMonthMetric(type)}
                  value={getMonthValue(type, monthEntries)}
                  isEmpty={monthEntries.every((entry) => entry.type !== type)}
                  isWide={isWide}
                />
              );
            })}
          </section>

          <h2 className='flex h-8 items-center px-4 text-body font-semibold text-fg-primary md:px-6'>
            최근 기록
          </h2>
          {hasNoRecords ? (
            <RecordsEmptyState />
          ) : (
            <ul
              aria-busy={isPending}
              className='flex flex-col gap-2 px-4 py-2 md:px-6'
            >
              {recentEntries.map((entry) => (
                <li key={entry.id}>
                  <RecentRecordItem
                    type={entry.type}
                    title={getListTitle(entry)}
                    subtitle={`${RECORD_TYPE_CONFIG[entry.type].label} · ${formatShortDate(entry.occurredAt)}`}
                    value={getListValue(entry)}
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
