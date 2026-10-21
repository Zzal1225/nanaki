import { Inbox, Plus } from 'lucide-react';
import NewRecordDropdown from '@/features/records/entry/NewRecordDropdown';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';

type DayEmptyStateProps = {
  // 고른 날. 작성 폼이 이 날짜로 시작한다 (지난 날 기록을 남길 때 날짜를 다시 고르지 않게)
  date: string;
  isToday: boolean;
};

// 고른 날 기록이 없을 때 (시안 empty). 기록 탭 빈 상태와 같은 타입 메뉴를 연다.
// 시안(아이콘 64px·제목 20px)보다 한 단계 작게 둔다: 바로 위 캘린더 칸 숫자가 14px라 빈 상태가 화면에서 가장 커 보였다.
// 제목은 하루 요약 머리(10월 16일)와 같은 16px. 버튼 높이는 줄이지 않는다 (터치 영역 44px)
export default function DayEmptyState({ date, isToday }: DayEmptyStateProps) {
  return (
    <div className='flex flex-col items-center gap-1 px-5 py-5 text-center'>
      <span className='mb-2 flex size-12 items-center justify-center rounded-full bg-surface-hover text-fg-secondary'>
        <Inbox
          aria-hidden='true'
          size={ICON_SIZE.lg}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </span>
      <p className='text-body font-semibold text-fg-primary'>기록이 없어요</p>
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
            className='mt-3 inline-flex min-h-11 items-center gap-2 rounded-md bg-accent px-4 text-body-sm font-semibold text-accent-foreground hover:bg-accent-hover active:bg-accent-pressed'
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
