import { Inbox, Plus } from 'lucide-react';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import NewRecordDropdown from '../entry/NewRecordDropdown';

// 시안 규격: 빈 상태 아이콘 28px
const EMPTY_ICON_SIZE = 28;

// 첫 기록이 없을 때. "기록 추가하기"는 사이드바와 같은 타입 메뉴를 연다
export default function RecordsEmptyState() {
  return (
    <div className='flex flex-col items-center gap-2 px-5 py-5 text-center'>
      <span className='mb-1 flex size-16 items-center justify-center rounded-full bg-surface-hover text-fg-secondary'>
        <Inbox
          aria-hidden='true'
          size={EMPTY_ICON_SIZE}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </span>
      <p className='text-title text-fg-primary'>기록이 없어요</p>
      <p className='text-body-sm text-fg-secondary'>
        첫 기록을 남기면 여기에 모여요
      </p>
      <NewRecordDropdown
        align='center'
        trigger={
          <button
            type='button'
            className='mt-2 inline-flex min-h-11 items-center gap-2 rounded-md bg-accent px-4 text-body-sm font-semibold text-accent-foreground hover:bg-accent-hover active:bg-accent-pressed'
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
