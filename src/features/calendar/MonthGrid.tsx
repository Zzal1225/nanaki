'use client';

// 'use client' 이유: 키보드 이동 후 새 칸으로 포커스를 옮기는 일(DOM focus)이 브라우저에서만 된다
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { RECORD_TYPE_CONFIG } from '@/features/records/schema/recordTypes';
import type { RecordType } from '@/features/records/schema/recordTypes';
import { RECORD_TYPE_STYLE } from '@/features/records/ui/recordTypeStyle';
import { getMonthGrid } from '@/shared/date/calendar';
import { formatMonthDayLabel } from '@/shared/date/formatDisplayDate';
import { toMonthString } from '@/shared/date/month';
import { getKeyboardTarget, type CalendarState } from './calendarState';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const DAY_OF_MONTH_START = 'YYYY-MM-'.length;

type MonthGridProps = {
  state: CalendarState;
  today: string;
  // 날짜 → 그날 기록이 있는 타입 (점). 기록을 불러오는 중이면 비어 있다
  dotTypesByDate: Map<string, RecordType[]>;
  onSelectDate: (date: string) => void;
  // 제목("2026년 10월")의 id. grid의 이름으로 읽힌다
  labelledBy: string;
};

// 화면 읽기 프로그램용 이름: "10월 16일 (금), 가계부·후기 기록". 점은 색이라 소리로는 전해지지 않는다
function toCellLabel(date: string, types: RecordType[]): string {
  const day = formatMonthDayLabel(date);
  if (types.length === 0) return day;
  const names = types.map((type) => RECORD_TYPE_CONFIG[type].label).join('·');
  return `${day}, ${names} 기록`;
}

// 월 보기 날짜 칸 (WAI-ARIA grid 패턴).
// - roving tabindex: 고른 날짜 칸만 tabIndex 0이라 Tab 한 번에 캘린더를 지나가고, 안에서는 방향키로 움직인다.
//   42칸이 모두 Tab 순서에 있으면 키보드 사용자가 캘린더를 벗어나려고 42번 눌러야 한다
// - 고른 날짜는 주소(?date=)가 기억한다. 칸은 받은 값을 그리기만 하고, 바꿀 때는 onSelectDate를 부른다
export default function MonthGrid({
  state,
  today,
  dotTypesByDate,
  onSelectDate,
  labelledBy,
}: MonthGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  // 키보드로 옮겼을 때만 포커스를 따라간다. 처음 화면을 열거나 ‹ › 버튼을 눌렀을 때
  // 포커스를 칸으로 빼앗으면 버튼을 연달아 누를 수 없다
  const shouldFollowFocusRef = useRef(false);

  // 다른 달로 넘어가면 칸이 새로 그려져서 포커스가 사라진다. 그려진 뒤(effect)에 새 칸을 찾아 다시 준다
  useEffect(() => {
    if (!shouldFollowFocusRef.current) return;
    shouldFollowFocusRef.current = false;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${state.date}"]`)
      ?.focus();
  }, [state.date]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = getKeyboardTarget(state, event.key);
    if (!target) return;
    // 방향키·PageDown이 페이지를 스크롤하지 않게
    event.preventDefault();
    shouldFollowFocusRef.current = true;
    onSelectDate(target);
  }

  const shownMonth = toMonthString(state.date);
  const weeks = getMonthGrid(state.date);

  return (
    <div
      ref={gridRef}
      role='grid'
      aria-labelledby={labelledBy}
      onKeyDown={handleKeyDown}
      className='flex flex-col px-3 lg:flex-1 lg:px-2 lg:pb-2'
    >
      <div
        role='row'
        className='grid h-6 grid-cols-7 items-center text-center text-caption text-fg-secondary lg:h-8'
      >
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} role='columnheader'>
            {label}
          </span>
        ))}
      </div>
      {/* PC는 남은 높이를 주 수(4~6)로 나눠 채운다. 1280×720에서 스크롤 없이 한 화면 (시안 P1) */}
      <div className='flex flex-col lg:flex-1'>
        {weeks.map((week) => (
          <div
            key={week[0]}
            role='row'
            className='grid grid-cols-7 lg:flex-1 lg:border-t lg:border-border'
          >
            {week.map((date) => {
              const isOtherMonth = toMonthString(date) !== shownMonth;
              const isToday = date === today;
              const isSelected = date === state.date;
              // 다른 달 칸은 흐린 숫자만 (시안). 그 달 기록은 불러오지도 않았다
              const types = isOtherMonth
                ? []
                : (dotTypesByDate.get(date) ?? []);

              return (
                <div
                  key={date}
                  role='gridcell'
                  aria-selected={isSelected}
                  className='lg:p-1'
                >
                  <button
                    type='button'
                    data-date={date}
                    tabIndex={isSelected ? 0 : -1}
                    aria-label={toCellLabel(date, types)}
                    aria-current={isToday ? 'date' : undefined}
                    onClick={() => onSelectDate(date)}
                    // 테두리는 늘 2px 두고 색만 바꾼다: 고를 때마다 칸 크기가 변해 달력이 흔들리지 않게
                    className={`flex h-12 w-full flex-col items-center gap-1 rounded-md border-2 pt-1 md:h-14 lg:h-full lg:min-h-16 lg:items-start lg:justify-between lg:p-2 ${
                      isSelected
                        ? 'border-fg-primary bg-surface'
                        : 'border-transparent hover:bg-surface-hover active:bg-surface-pressed'
                    }`}
                  >
                    <span
                      aria-hidden='true'
                      className={`flex size-6.5 items-center justify-center rounded-full text-body-sm tabular-nums lg:size-7 ${
                        isToday
                          ? 'bg-accent font-bold text-accent-foreground'
                          : `font-medium ${isOtherMonth ? 'text-fg-secondary' : 'text-fg-primary'}`
                      }`}
                    >
                      {Number(date.slice(DAY_OF_MONTH_START))}
                    </span>
                    <span
                      aria-hidden='true'
                      className='flex h-1.5 gap-1 lg:pl-1'
                    >
                      {types.map((type) => (
                        <span
                          key={type}
                          className={`size-1.5 rounded-full ${RECORD_TYPE_STYLE[type].dotClass}`}
                        />
                      ))}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
