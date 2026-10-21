import { Inbox, Plus } from 'lucide-react';
import NewRecordDropdown from '@/features/records/entry/NewRecordDropdown';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';

// 시안 규격: 빈 상태 아이콘 28px
const EMPTY_ICON_SIZE = 28;

type DayEmptyStateProps = {
  // 고른 날. 작성 폼이 이 날짜로 시작한다 (지난 날 기록을 남길 때 날짜를 다시 고르지 않게)
  date: string;
  isToday: boolean;
};

// 고른 날 기록이 없을 때 (시안 empty). 기록 탭 빈 상태와 같은 타입 메뉴를 연다
export default function DayEmptyState({ date, isToday }: DayEmptyStateProps) {
  return (
    <div className='flex flex-col items-center gap-2 px-5 py-8 text-center'>
      <span className='mb-1 flex size-16 items-center justify-center rounded-full bg-surface-hover text-fg-secondary'>
        <Inbox
          aria-hidden='true'
          size={EMPTY_ICON_SIZE}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </span>
      <p className='text-title text-fg-primary'>기록이 없어요</p>
      <p className='text-body-sm text-fg-secondary'>
        {/* 시안 문구는 오늘 기준. 지난 날을 보고 있을 때 "오늘"이라고 하면 틀린 말이 된다 */}
        {isToday
          ? '오늘 있었던 일 하나만 남겨볼까요?'
          : '이날 있었던 일 하나만 남겨볼까요?'}
      </p>
      <NewRecordDropdown
        align='center'
        date={date}
        trigger={
          <button
            type='button'
            className='mt-2 inline-flex min-h-11 items-center gap-2 rounded-md bg-accent px-4 text-body-sm font-semibold text-accent-foreground hover:bg-accent-hover'
          >
            <Plus
              aria-hidden='true'
              size={ICON_SIZE.sm}
              strokeWidth={ICON_STROKE_WIDTH}
            />
            기록 추가하기
          </button>
        }
      />
    </div>
  );
}
