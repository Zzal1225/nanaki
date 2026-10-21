'use client';

// 'use client' 이유: 오늘 날짜·주소(?date=)·기록을 모두 브라우저에서 읽고, 키보드로 칸을 옮긴다
import { useId, useMemo } from 'react';
import { useRecords } from '@/features/records/hooks/useRecords';
import type { RecordType } from '@/features/records/schema/recordTypes';
import { useVisibleTypes } from '@/features/settings/hooks/useUserSettings';
import { filterVisibleEntries } from '@/features/settings/typeVisibility';
import {
  formatYearMonthLabel,
  getMonthRangeOf,
  // 'YYYY-MM' 달 이동 (제목·버튼 이름용). 고른 날짜를 옮기는 calendarState.shiftMonth와 이름이 겹쳐 바꿔 부른다
  shiftMonth as shiftYearMonth,
  toMonthString,
} from '@/shared/date/month';
import CalendarGrid from './CalendarGrid';
import CalendarHeader from './CalendarHeader';
import DaySummary from './DaySummary';
import { groupByDate, groupByType } from './dayRecords';
import { useCalendar } from './useCalendar';

// 홈 = 월 캘린더 + 고른 날 요약. 모바일·태블릿은 위아래, PC(lg)는 좌우 (시안 P1: 오른쪽 400px).
// 차이는 CSS로만 낸다: 화면 폭을 JS로 읽어 다른 컴포넌트를 그리면 서버 HTML과 어긋난다 (CLAUDE.md)
export default function HomeCalendar() {
  const calendar = useCalendar();
  const titleId = useId();

  const month = calendar ? toMonthString(calendar.date) : null;
  // 달 안에서 날짜를 옮기면 같은 기간이라 쿼리 키가 그대로 → 다시 불러오지 않는다
  const records = useRecords(month ? getMonthRangeOf(month) : null);

  // 설정에서 끈 타입의 기록은 점·요약에서 뺀다 (데이터는 그대로).
  // 날짜별 묶음은 기록이나 켜진 타입이 바뀔 때만 다시 만든다. 방향키로 날짜만 옮길 때는 그대로 쓴다
  const visibleTypes = useVisibleTypes();
  const recordsByDate = useMemo(
    () => groupByDate(filterVisibleEntries(records.data ?? [], visibleTypes)),
    [records.data, visibleTypes],
  );
  const dotTypesByDate = useMemo(() => {
    const byDate = new Map<string, RecordType[]>();
    for (const [date, entries] of recordsByDate) {
      byDate.set(
        date,
        groupByType(entries).map((group) => group.type),
      );
    }
    return byDate;
  }, [recordsByDate]);

  if (!calendar || !month) {
    // 오늘을 읽기 전(서버·첫 하이드레이션). 높이를 잡아 두어 그려질 때 아래가 밀리지 않게
    return (
      <div aria-busy='true' className='p-4 lg:p-6'>
        <div className='h-80 animate-pulse rounded-lg bg-surface-hover' />
      </div>
    );
  }

  const { date, today } = calendar;
  const dayEntries = recordsByDate.get(date) ?? [];

  return (
    // 모바일 아래 여백: 하단 탭은 main이 비워 두고, 여기서는 스피드 다이얼(56px)에 마지막 줄이 가리지 않게 더 비운다
    <div className='flex flex-col pb-24 md:pb-6 lg:h-dvh lg:flex-row lg:gap-6 lg:p-6'>
      <section
        aria-labelledby={titleId}
        className='flex flex-col lg:min-w-0 lg:flex-1'
      >
        <CalendarHeader
          title={formatYearMonthLabel(month)}
          titleId={titleId}
          // "2026년 11월로": 어디로 가는지 버튼 이름으로 알려 준다
          previousLabel={`${formatYearMonthLabel(shiftYearMonth(month, -1))}로`}
          nextLabel={`${formatYearMonthLabel(shiftYearMonth(month, 1))}로`}
          onPrevious={() => calendar.shiftMonth(-1)}
          onNext={() => calendar.shiftMonth(1)}
          today={today}
          onToday={calendar.goToday}
        />
        {/* PC는 카드가 남은 높이를 채운다 */}
        <div className='lg:flex lg:flex-1 lg:flex-col lg:rounded-lg lg:bg-surface lg:pt-1 lg:shadow-card'>
          <CalendarGrid
            date={date}
            today={today}
            dotTypesByDate={dotTypesByDate}
            // isPending: 이 달 캐시가 아직 없을 때만. 다시 온 달은 캐시를 바로 그리고 뒤에서 새로 받으므로 바쁘지 않다
            isBusy={records.isPending}
            onSelectDate={calendar.selectDate}
            labelledBy={titleId}
          />
        </div>
      </section>

      <div className='px-4 pt-4 lg:w-(--detail-panel) lg:shrink-0 lg:overflow-y-auto lg:px-0 lg:pt-0'>
        <DaySummary
          key={date}
          date={date}
          isToday={date === today}
          groups={records.isPending ? null : groupByType(dayEntries)}
          isError={records.isError}
          onRetry={() => void records.refetch()}
        />
      </div>
    </div>
  );
}
