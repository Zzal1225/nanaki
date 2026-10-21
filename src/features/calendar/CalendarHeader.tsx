import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { SETTINGS_ITEM } from '@/shared/layout/navItems';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import TodayButton from './TodayButton';

type CalendarHeaderProps = {
  title: string;
  titleId: string;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  today: string;
  onToday: () => void;
};

// 시안 규격: 기간 이동 아이콘 22px (일반 규격 20·24 사이)
const NAV_ICON_SIZE = 22;

// 테두리 없는 아이콘 버튼. 머리는 "지금 어디를 보는지(제목)"가 주인공이라 이동 버튼은 조용하게 둔다
const ICON_BUTTON_CLASS =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-md text-fg-primary hover:bg-surface-hover active:bg-surface-pressed';

// ‹ 2026년 10월 › … [오늘] ⚙ (모바일·PC 같은 모양. ⚙만 모바일 전용).
// 달 이동은 링크가 아니라 버튼이다: 주소는 useCalendar가 history로 바꾼다 (서버 요청 없이)
export default function CalendarHeader({
  title,
  titleId,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  today,
  onToday,
}: CalendarHeaderProps) {
  const SettingsIcon = SETTINGS_ITEM.icon;

  return (
    <div className='flex h-14 items-center px-2 lg:mb-2 lg:px-0'>
      <button
        type='button'
        aria-label={previousLabel}
        onClick={onPrevious}
        className={ICON_BUTTON_CLASS}
      >
        <ChevronLeft
          aria-hidden='true'
          size={NAV_ICON_SIZE}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </button>
      {/* 기간이 바뀌면 화면 읽기 프로그램이 새 제목을 읽어 준다 (칸 포커스가 그대로여도).
          min-w-0 + truncate: 375px에서 "9월 27일–10월 3일"이 길어도 오른쪽 버튼을 밀어내지 않게 */}
      <h1
        id={titleId}
        aria-live='polite'
        className='min-w-0 truncate px-1 text-title font-bold text-fg-primary tabular-nums lg:text-title-lg'
      >
        {title}
      </h1>
      <button
        type='button'
        aria-label={nextLabel}
        onClick={onNext}
        className={ICON_BUTTON_CLASS}
      >
        <ChevronRight
          aria-hidden='true'
          size={NAV_ICON_SIZE}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </button>
      <span className='flex-1' />
      <TodayButton today={today} onClick={onToday} />
      {/* 모바일만. 태블릿·PC는 사이드바 맨 아래에 설정이 있다 (navItems) */}
      <Link
        href={SETTINGS_ITEM.href}
        aria-label={SETTINGS_ITEM.label}
        className={`${ICON_BUTTON_CLASS} md:hidden`}
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
