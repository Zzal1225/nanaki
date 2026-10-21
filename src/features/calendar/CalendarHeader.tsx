import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { SETTINGS_ITEM } from '@/shared/layout/navItems';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import { CALENDAR_VIEWS, type CalendarView } from './calendarState';

type CalendarHeaderProps = {
  title: string;
  titleId: string;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
};

const VIEW_OPTIONS = [
  { value: 'month', label: '월' },
  { value: 'week', label: '주' },
] as const satisfies readonly { value: CalendarView; label: string }[];

// Radix 라디오 그룹은 값을 그냥 string으로 넘겨준다. 모르는 값이면 무시해서 주소에 이상한 보기가 들어가지 않게
function toCalendarView(value: string): CalendarView | null {
  return CALENDAR_VIEWS.find((view) => view === value) ?? null;
}

// 시안 규격: 달 이동 아이콘 22px (일반 규격 20·24 사이)
const NAV_ICON_SIZE = 22;

const ROUND_BUTTON_CLASS =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-fg-primary hover:bg-surface-hover active:bg-surface-pressed';

// ‹ 2026년 10월 › [오늘] … [월|주] ⚙ (시안 홈 위쪽).
// 기간 이동은 링크가 아니라 버튼이다: 주소는 useCalendar가 history로 바꾼다 (서버 요청 없이)
export default function CalendarHeader({
  title,
  titleId,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  onToday,
  view,
  onViewChange,
}: CalendarHeaderProps) {
  const SettingsIcon = SETTINGS_ITEM.icon;

  return (
    <div className='flex h-14 items-center px-2 lg:mb-2 lg:px-0'>
      <button
        type='button'
        aria-label={previousLabel}
        onClick={onPrevious}
        className={ROUND_BUTTON_CLASS}
      >
        <ChevronLeft
          aria-hidden='true'
          size={NAV_ICON_SIZE}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </button>
      {/* 기간이 바뀌면 화면 읽기 프로그램이 새 제목을 읽어 준다 (칸 포커스가 그대로여도).
          min-w-0 + truncate: 375px에서 "9월 27일–10월 3일"이 길어도 월|주 버튼을 밀어내지 않게 */}
      <h1
        id={titleId}
        aria-live='polite'
        className='min-w-0 truncate px-2 text-title text-fg-primary tabular-nums lg:text-title-lg'
      >
        {title}
      </h1>
      <button
        type='button'
        aria-label={nextLabel}
        onClick={onNext}
        className={ROUND_BUTTON_CLASS}
      >
        <ChevronRight
          aria-hidden='true'
          size={NAV_ICON_SIZE}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </button>
      {/* 모바일은 자리가 좁아 하루 요약 머리에 "오늘"을 둔다 (DaySummary) */}
      <button
        type='button'
        onClick={onToday}
        className='ml-2 hidden min-h-11 items-center rounded-full border border-border bg-surface px-4 text-body-sm font-medium text-fg-primary hover:bg-surface-hover active:bg-surface-pressed md:inline-flex'
      >
        오늘
      </button>
      <span className='flex-1' />
      <SegmentedControl
        aria-label='보기'
        options={VIEW_OPTIONS}
        value={view}
        onValueChange={(value) => {
          const next = toCalendarView(value);
          if (next) onViewChange(next);
        }}
        className='ml-2 shrink-0'
      />
      {/* 모바일만. 태블릿·PC는 사이드바 맨 아래에 설정이 있다 (navItems) */}
      <Link
        href={SETTINGS_ITEM.href}
        aria-label={SETTINGS_ITEM.label}
        className='inline-flex size-11 items-center justify-center rounded-md text-fg-primary hover:bg-surface-hover active:bg-surface-pressed md:hidden'
      >
        <SettingsIcon
          aria-hidden='true'
          size={ICON_SIZE.lg}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </Link>
    </div>
  );
}
