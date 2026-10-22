'use client';

// 'use client' 이유: 기록을 브라우저에서 불러온다(TanStack Query). step2에서 오프라인(IndexedDB)으로 바꿀 자리라 클라이언트 중심
import { openRecordId, recordViewHref } from '../routes/recordRoutes';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { formatShortDate } from '@/shared/date/formatDisplayDate';
import {
  getMonthRangeOf,
  shiftMonth,
  toMonthString,
} from '@/shared/date/month';
import { filterInRange, getSamePeriod } from '@/shared/date/samePeriod';
import { useToday } from '@/shared/date/useToday';
import Button from '@/shared/ui/Button';
import { useVisibleTypes } from '@/features/settings/hooks/useUserSettings';
import { filterVisibleEntries } from '@/features/settings/typeVisibility';
import { useRecentRecords } from '../hooks/useRecentRecords';
import { usePendingRecordIds } from '../hooks/usePendingRecordIds';
import { useRecords } from '../hooks/useRecords';
import { useRoutines } from '@/features/routines/hooks/useRoutines';
import SearchBarLink from '@/features/search/SearchBarLink';
import MobileSettingsLink from '@/shared/layout/MobileSettingsLink';
import { RECORD_TYPE_CONFIG } from '../schema/recordTypes';
import {
  getListTitle,
  getListValue,
  getMonthValue,
  getPreviousMonthComparison,
} from '../ui/recordPresentation';
import MonthSummaryCard from './MonthSummaryCard';
import RecentRecordItem from './RecentRecordItem';
import RecordsEmptyState from './RecordsEmptyState';

// 시안은 3개를 보여 준다. 화면 한 장을 채우고도 남는 정도로 넉넉히, 전체 목록은 타입 상세(13c)에서
export const RECENT_RECORD_LIMIT = 20;

// 기록 탭 첫 화면: 이번 달 타입 카드 + 최근 기록 (시안 7번).
// 조회는 훅이, 값 계산은 recordPresentation이, 모양은 카드·목록 컴포넌트가 맡는다
// cacheComponents: 열린 기록(?id=)은 미리 그릴 때 알 수 없어서 주소를 읽는 부분이 기다린다.
// Suspense로 감싸서 앱 틀은 미리 그리고, 기다리는 동안은 선택 표시 없는 같은 모양(openId = null)을 먼저 보여 준다
export default function RecordsOverview() {
  return (
    <Suspense fallback={<RecordsOverviewView openId={null} />}>
      <RecordsOverviewWithPathname />
    </Suspense>
  );
}

function RecordsOverviewWithPathname() {
  return (
    <RecordsOverviewView
      openId={openRecordId(usePathname(), useSearchParams())}
    />
  );
}

// openId: PC에서 오른쪽 패널에 열린 기록 (상세·수정 모두 선택된 것으로 본다)
function RecordsOverviewView({ openId }: { openId: string | null }) {
  // 오늘은 브라우저에서만 안다 (미리 그리기에서는 null → 카드 자리만 보이고 조회도 미룬다)
  const today = useToday();
  const currentMonth = today ? toMonthString(today) : null;
  const monthRecords = useRecords(
    currentMonth ? getMonthRangeOf(currentMonth) : null,
  );
  // 지난달 같은 기간과 비교하려고 지난달 전체를 더 불러온다 (기록 조회 1번 추가).
  // 달 전체로 부르는 이유: 홈 캘린더에서 지난달로 넘어갈 때와 같은 쿼리 키라 캐시를 함께 쓴다. 기간 자르기는 아래에서
  const previousMonthRecords = useRecords(
    currentMonth ? getMonthRangeOf(shiftMonth(currentMonth, -1)) : null,
  );
  const recentRecords = useRecentRecords(RECENT_RECORD_LIMIT);
  // 아직 서버에 보내지 않은 기록에 구름 아이콘 (시안 15a)
  const pendingIds = usePendingRecordIds();
  // 루틴 카드의 달성률은 "해야 했던 날"(루틴 규칙)이 있어야 계산된다 (2026-10-22 사용자 결정: 달성률)
  const routines = useRoutines();

  // 지난달까지 기다린다: 비교 줄이 나중에 끼어들며 카드 높이가 바뀌지 않게.
  // 지난달 조회가 실패하면 비교 줄만 빠지고 카드는 그대로 보인다 (isError에 넣지 않는다)
  const isPending =
    monthRecords.isPending ||
    previousMonthRecords.isPending ||
    recentRecords.isPending ||
    routines.isPending;
  const isError = monthRecords.isError || recentRecords.isError;
  // 설정에서 끈 타입은 카드도 기록도 숨긴다 (데이터는 그대로)
  const visibleTypes = useVisibleTypes();
  const monthEntries = monthRecords.data ?? [];
  // 비교는 같은 기간끼리: 이번 달 1일~오늘 vs 지난달 1일~같은 날 (카드 값은 그대로 이번 달 전체)
  // 카드 값 계산에 기록 말고 필요한 것 (지금은 루틴 달성률만 쓴다)
  const monthContext = {
    routines: routines.data ?? [],
    period: currentMonth && today ? getSamePeriod(currentMonth, today) : null,
  };
  const period =
    currentMonth && today ? getSamePeriod(currentMonth, today) : null;
  const currentPeriodEntries = period
    ? filterInRange(monthEntries, period.current)
    : [];
  const previousPeriodEntries =
    period && previousMonthRecords.data
      ? filterInRange(previousMonthRecords.data, period.previous)
      : [];
  const recentEntries = filterVisibleEntries(
    recentRecords.data ?? [],
    visibleTypes,
  );
  const hasNoRecords = !isPending && !isError && recentEntries.length === 0;

  return (
    <div className='mx-auto flex w-full max-w-xl flex-col pb-6'>
      {/* 보이는 "기록" 제목은 두지 않는다 (2026-10-22 사용자 결정: 하단 탭 이름과 겹친다).
          화면 읽기 프로그램에는 이 화면의 제목이 있어야 해서 sr-only로 남긴다 */}
      <h1 className='sr-only'>기록</h1>
      {/* 기록을 불러오지 못해도 검색은 따로 시도할 수 있게 오류 안내보다 위에 둔다 */}
      {/* 검색창 옆 ⚙: 홈 머리와 같은 자리(오른쪽 끝)에 설정 (모바일만, MobileSettingsLink) */}
      <div className='flex items-center gap-2 px-4 pt-6 md:px-6'>
        <div className='min-w-0 flex-1'>
          <SearchBarLink />
        </div>
        <MobileSettingsLink origin='records' />
      </div>

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
          {/* 카드 위 "10월 요약" 제목은 두지 않는다 (2026-10-22 사용자 결정). 화면 읽기 프로그램에는 이름만 알린다 */}
          <section
            aria-label='이번 달 요약'
            // 불러오는 중에는 숫자 대신 회색 자리만. 스크린 리더에는 "불러오는 중"을 알린다
            aria-busy={isPending}
            className='grid grid-cols-2 gap-2 px-4 py-4 md:px-6'
          >
            {visibleTypes.map((type, index) => {
              const isLast = index === visibleTypes.length - 1;
              // 시안: 첫 카드는 한 줄 전체, 나머지가 홀수 개면 마지막 카드도 한 줄 전체
              const isWide =
                index === 0 || ((visibleTypes.length - 1) % 2 === 1 && isLast);
              return isPending ? (
                <div
                  key={type}
                  className={`h-[90px] animate-pulse rounded-lg bg-surface-hover ${isWide ? 'col-span-2' : ''}`}
                />
              ) : (
                <MonthSummaryCard
                  key={type}
                  type={type}
                  value={getMonthValue(type, monthEntries, monthContext)}
                  comparison={getPreviousMonthComparison(
                    type,
                    currentPeriodEntries,
                    previousPeriodEntries,
                    monthContext,
                  )}
                  isEmpty={monthEntries.every((entry) => entry.type !== type)}
                  isWide={isWide}
                  href={`/records/type/${type}`}
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
                    href={recordViewHref(entry.id)}
                    isPending={pendingIds.has(entry.id)}
                    isSelected={openId === entry.id}
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
