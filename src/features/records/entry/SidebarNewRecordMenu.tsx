import { ChevronDown, Plus } from 'lucide-react';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import NewRecordDropdown from './NewRecordDropdown';

// 태블릿·PC 사이드바의 "새 기록" 버튼.
// 접힌 사이드바(태블릿)는 + 버튼만, 펼친 사이드바(PC)는 "+ 새 기록 ⌄" (폭에 따라 CSS로만 바꾼다)
export default function SidebarNewRecordMenu() {
  return (
    <NewRecordDropdown
      trigger={
        <button
          type='button'
          aria-label='새 기록'
          className='group mx-auto flex size-11 items-center justify-center rounded-md bg-accent text-body-sm font-semibold text-accent-foreground hover:bg-accent-hover active:bg-accent-pressed lg:mx-0 lg:w-full lg:justify-start lg:gap-2 lg:px-3'
        >
          <Plus
            aria-hidden='true'
            size={ICON_SIZE.md}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          <span className='sr-only lg:not-sr-only'>새 기록</span>
          <ChevronDown
            aria-hidden='true'
            size={ICON_SIZE.sm}
            strokeWidth={ICON_STROKE_WIDTH}
            // 열리면 화살표를 뒤집는다 (시안). Radix가 버튼에 붙이는 data-state로 판단해서 상태를 따로 두지 않는다
            className='ml-auto hidden transition-transform group-data-[state=open]:rotate-180 lg:block'
          />
        </button>
      }
    />
  );
}
