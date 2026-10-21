import { ChevronDown, ChevronUp } from 'lucide-react';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import type { CalendarView } from './calendarState';

type ViewToggleProps = {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  // 접고 펴는 대상(캘린더 grid)의 id
  controls: string;
};

// 캘린더 아래 손잡이: 월 보기 → "주 보기 ⌃"(접기), 주 보기 → "월 보기 ⌄"(펴기).
// 머리의 월|주 버튼 대신 여기 둔 이유: 주 보기는 캘린더를 한 줄로 "접는" 동작이라 접히는 자리 바로 아래가 자연스럽고,
// 머리에는 기간 이동과 오늘만 남아 모바일 한 줄이 여유롭다.
// 두 값 중 하나를 고르는 라디오가 아니라 접기·펴기 버튼이라 aria-expanded로 상태를 알린다
export default function ViewToggle({
  view,
  onViewChange,
  controls,
}: ViewToggleProps) {
  const isMonth = view === 'month';
  const Icon = isMonth ? ChevronUp : ChevronDown;

  return (
    <button
      type='button'
      aria-expanded={isMonth}
      aria-controls={controls}
      onClick={() => onViewChange(isMonth ? 'week' : 'month')}
      className='mx-auto flex min-h-11 flex-col items-center justify-center gap-1 rounded-md px-4 text-caption text-fg-secondary hover:bg-surface-hover active:bg-surface-pressed'
    >
      {/* 끌어서 접는 시트 손잡이처럼 보이는 막대. 장식이라 숨긴다 (끌기는 지원하지 않고 누르기만) */}
      <span aria-hidden='true' className='h-1 w-8 rounded-full bg-border' />
      <span className='flex items-center gap-0.5'>
        {isMonth ? '주 보기' : '월 보기'}
        <Icon
          aria-hidden='true'
          size={ICON_SIZE.sm}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </span>
    </button>
  );
}
