'use client';

// 'use client' 이유: 타입 줄의 펼침 상태(useState)를 들고 있다
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
  getDayLabel,
  getDayValue,
  getListTitle,
  getListValue,
} from '@/features/records/ui/recordPresentation';
import type { RecordType } from '@/features/records/schema/recordTypes';
import { formatMonthDayLabel } from '@/shared/date/formatDisplayDate';
import Button from '@/shared/ui/Button';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import DayEmptyState from './DayEmptyState';
import DayTypeRow from './DayTypeRow';
import type { DayTypeGroup } from './dayRecords';

type DaySummaryProps = {
  date: string;
  isToday: boolean;
  // 불러오는 중이면 null
  groups: DayTypeGroup[] | null;
  isError: boolean;
  onRetry: () => void;
  // 전날(-1)·다음 날(+1)
  onShiftDay: (delta: number) => void;
  onGoToday: () => void;
};

const DAY_NAV_BUTTON_CLASS =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-fg-primary hover:bg-surface-hover';

// 고른 날의 요약 (시안: 캘린더 아래, PC는 오른쪽 400px).
// 부모가 key={date}로 그려서 날짜가 바뀌면 이 컴포넌트가 새로 만들어지고 펼친 줄도 모두 접힌다.
// effect로 "날짜가 바뀌면 접기"를 하면 한 번 펼친 채로 그렸다가 다시 그려 깜빡인다
export default function DaySummary({
  date,
  isToday,
  groups,
  isError,
  onRetry,
  onShiftDay,
  onGoToday,
}: DaySummaryProps) {
  const [openTypes, setOpenTypes] = useState<ReadonlySet<RecordType>>(
    () => new Set(),
  );

  function toggle(type: RecordType) {
    setOpenTypes((previous) => {
      const next = new Set(previous);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  return (
    <section
      aria-labelledby='day-summary-title'
      className='flex flex-col gap-2'
    >
      <div className='flex h-14 items-center gap-1 lg:h-11'>
        <button
          type='button'
          aria-label='전날'
          onClick={() => onShiftDay(-1)}
          className={DAY_NAV_BUTTON_CLASS}
        >
          <ChevronLeft
            aria-hidden='true'
            size={ICON_SIZE.md}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </button>
        <h2
          id='day-summary-title'
          className='px-2 text-body font-semibold text-fg-primary tabular-nums lg:text-title'
        >
          {formatMonthDayLabel(date)}
        </h2>
        <button
          type='button'
          aria-label='다음 날'
          onClick={() => onShiftDay(1)}
          className={DAY_NAV_BUTTON_CLASS}
        >
          <ChevronRight
            aria-hidden='true'
            size={ICON_SIZE.md}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </button>
        {isToday ? (
          <span className='ml-1 inline-flex h-6 items-center rounded-full bg-accent px-2 text-caption font-semibold text-accent-foreground'>
            오늘
          </span>
        ) : (
          // 모바일 전용 "오늘로" 버튼. 오늘 뱃지가 있던 자리라 찾기 쉽다.
          // 태블릿·PC는 캘린더 머리에 "오늘" 버튼이 있다 (CalendarHeader)
          <button
            type='button'
            onClick={onGoToday}
            className='ml-1 inline-flex min-h-11 items-center rounded-full px-3 text-body-sm font-medium text-accent hover:bg-surface-hover md:hidden'
          >
            오늘로
          </button>
        )}
      </div>

      {isError ? (
        <div role='alert' className='flex flex-col items-start gap-3 py-2'>
          <p className='text-body text-fg-primary'>
            기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
          <Button variant='secondary' onClick={onRetry}>
            다시 시도
          </Button>
        </div>
      ) : !groups ? (
        <div
          aria-busy='true'
          className='h-26 animate-pulse rounded-lg bg-surface-hover'
        />
      ) : groups.length === 0 ? (
        <DayEmptyState date={date} isToday={isToday} />
      ) : (
        <ul className='overflow-hidden rounded-lg bg-surface shadow-card'>
          {groups.map(({ type, entries }) => (
            <DayTypeRow
              key={type}
              type={type}
              label={getDayLabel(type, entries)}
              value={getDayValue(type, entries)}
              items={entries.map((entry) => ({
                id: entry.id,
                title: getListTitle(entry),
                value: getListValue(entry),
              }))}
              isOpen={openTypes.has(type)}
              onToggle={() => toggle(type)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
