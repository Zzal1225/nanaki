'use client';

// 'use client' 이유: 메뉴 열림 상태와 키보드 조작이 브라우저에서 일어난다
import { DropdownMenu } from 'radix-ui';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { RECORD_TYPE_STYLE } from '../ui/recordTypeStyle';
import { NEW_RECORD_MENU_ITEMS } from './newRecordMenu';

type NewRecordDropdownProps = {
  // 누르면 메뉴가 열리는 버튼. 모양은 쓰는 곳(사이드바, 빈 상태)마다 달라서 밖에서 받는다
  trigger: ReactElement;
  align?: 'start' | 'center' | 'end';
};

// "어떤 기록을 쓸지" 고르는 메뉴. 사이드바와 기록 탭 빈 상태가 같은 메뉴를 쓴다.
// 모바일 스피드 다이얼은 모양(덮개 + 아래에서 위로)이 달라 따로 그리지만 목록(NEW_RECORD_MENU_ITEMS)은 같다
export default function NewRecordDropdown({
  trigger,
  align = 'start',
}: NewRecordDropdownProps) {
  return (
    <DropdownMenu.Root>
      {/* asChild: 받은 버튼을 그대로 쓰고 Radix는 열기·키보드 동작만 붙인다 */}
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side='bottom'
          align={align}
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
