'use client';

// 'use client' 이유: 메뉴 열림 상태와 키보드 조작이 브라우저에서 일어난다
import { DropdownMenu } from 'radix-ui';
import { ChevronDown, Plus } from 'lucide-react';
import Link from 'next/link';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { RECORD_TYPE_STYLE } from '../ui/recordTypeStyle';
import { NEW_RECORD_MENU_ITEMS } from './newRecordMenu';

// 태블릿·PC 사이드바의 "새 기록" 버튼. 모바일의 스피드 다이얼과 같은 목록(NEW_RECORD_MENU_ITEMS)을 쓴다.
// 접힌 사이드바(태블릿)는 + 버튼만, 펼친 사이드바(PC)는 "+ 새 기록 ⌄" (폭에 따라 CSS로만 바꾼다)
export default function SidebarNewRecordMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label='새 기록'
        className='group mx-auto flex size-11 items-center justify-center rounded-md bg-accent text-body-sm font-semibold text-accent-foreground hover:bg-accent-hover lg:mx-0 lg:w-full lg:justify-start lg:gap-2 lg:px-3'
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
          // 열리면 화살표를 뒤집는다 (시안). Radix가 붙이는 data-state로 판단해서 상태를 따로 두지 않는다
          className='ml-auto hidden transition-transform group-data-[state=open]:rotate-180 lg:block'
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side='bottom'
          align='start'
          sideOffset={8}
          className='z-40 min-w-48 rounded-md border border-border bg-surface-raised p-1 shadow-float'
        >
          {NEW_RECORD_MENU_ITEMS.map((item) => {
            const style = RECORD_TYPE_STYLE[item.type];
            const Icon = style.icon;
            return (
              <DropdownMenu.Item key={item.type} asChild>
                <Link
                  href={item.href}
                  className='flex min-h-11 items-center gap-3 rounded-sm px-3 text-body-sm font-medium text-fg-primary outline-none data-highlighted:bg-surface-hover'
                >
                  <Icon
                    aria-hidden='true'
                    size={ICON_SIZE.md}
                    strokeWidth={ICON_STROKE_WIDTH}
                    className={style.textClass}
                  />
                  {item.label}
                </Link>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
