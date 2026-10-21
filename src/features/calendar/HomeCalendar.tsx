'use client';

// 'use client' 이유: 오늘 날짜·주소(?date=)·기록을 모두 브라우저에서 읽고, 키보드로 칸을 옮긴다
import { useId, useMemo } from 'react';
import { useRecords } from '@/features/records/hooks/useRecords';
import type { RecordType } from '@/features/records/schema/recordTypes';
import { addDaysTo } from '@/shared/date/calendar';
import CalendarGrid from './CalendarGrid';
import CalendarHeader from './CalendarHeader';
import { formatPeriodTitle, getVisibleRange } from './calendarPeriod';
import { shiftPeriod } from './calendarState';
import DaySummary from './DaySummary';
import { groupByDate, groupByType } from './dayRecords';
import { useCalendar } from './useCalendar';

// 홈 = 캘린더 + 고른 날 요약. 모바일·태블릿은 위아래, PC(lg)는 좌우 (시안 P1: 오른쪽 400px).
// 차이는 CSS로만 낸다: 화면 폭을 JS로 읽어 다른 컴포넌트를 그리면 서버 HTML과 어긋난다 (CLAUDE.md)
export default function HomeCalendar() {
  const calendar = useCalendar();
  const titleId = useId();

  // 보이는 기간(그 달 또는 그 주) 안에서 날짜를 옮기면 쿼리 키가 그대로 → 다시 불러오지 않는다
  const records = useRecords(calendar ? getVisibleRange(calendar.state) : null);

  // 날짜별 묶음은 기록이 바뀔 때만 다시 만든다. 방향키로 날짜만 옮길 때는 그대로 쓴다
  const recordsByDate = useMemo(
    () => groupByDate(records.data ?? []),
    [records.data],
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

  if (!calendar) {
    // 오늘을 읽기 전(서버·첫 하이드레이션). 높이를 잡아 두어 그려질 때 아래가 밀리지 않게
    return (
      <div aria-busy='true' className='p-4 lg:p-6'>
        <div className='h-80 animate-pulse rounded-lg bg-surface-hover' />
      </div>
    );
  }

  const { state, today } = calendar;
  const dayEntries = recordsByDate.get(state.date) ?? [];

  return (
    // 모바일 아래 여백: 하단 탭은 main이 비워 두고, 여기서는 스피드 다이얼(56px)에 마지막 줄이 가리지 않게 더 비운다
    <div className='flex flex-col pb-24 md:pb-6 lg:h-dvh lg:flex-row lg:gap-6 lg:p-6'>
      <section
        aria-labelledby={titleId}
        className='flex flex-col lg:min-w-0 lg:flex-1'
      >
        <CalendarHeader
          title={formatPeriodTitle(state)}
          titleId={titleId}
          // "2026년 11월로", "10월 25–31일로": 어디로 가는지 버튼 이름으로 알려 준다
          previousLabel={`${formatPeriodTitle(shiftPeriod(state, -1))}로`}
          nextLabel={`${formatPeriodTitle(shiftPeriod(state, 1))}로`}
          onPrevious={() => calendar.shiftPeriod(-1)}
          onNext={() => calendar.shiftPeriod(1)}
          onToday={calendar.goToday}
          view={state.view}
          onViewChange={calendar.setView}
        />
        {/* PC 월 보기는 카드가 남은 높이를 채운다. 주 보기는 한 줄이라 칸 높이만큼만 */}
        <div
          className={`lg:flex lg:flex-col lg:rounded-lg lg:bg-surface lg:pt-1 lg:shadow-card ${
            state.view === 'month' ? 'lg:flex-1' : ''
          }`}
        >
          <CalendarGrid
            state={state}
            today={today}
            dotTypesByDate={dotTypesByDate}
            onSelectDate={calendar.selectDate}
            labelledBy={titleId}
          />
        </div>
      </section>

      <div className='px-4 pt-2 lg:w-(--detail-panel) lg:shrink-0 lg:overflow-y-auto lg:px-0 lg:pt-0'>
        <DaySummary
          key={state.date}
          date={state.date}
          isToday={state.date === today}
          groups={records.isPending ? null : groupByType(dayEntries)}
          isError={records.isError}
          onRetry={() => void records.refetch()}
          onShiftDay={(delta) =>
            calendar.selectDate(addDaysTo(state.date, delta))
          }
          onGoToday={calendar.goToday}
        />
      </div>
    </div>
  );
}
