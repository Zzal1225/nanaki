'use client';

// 'use client' 이유: 열림 상태, 지금 주소(작성 화면에서는 숨김)를 알아야 한다
import { DropdownMenu } from 'radix-ui';
import { Plus, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { RECORD_TYPE_STYLE } from '../ui/recordTypeStyle';
import { NEW_RECORD_MENU_ITEMS } from './newRecordMenu';

const NEW_RECORD_PATH = '/records/new';
const EDIT_PATH_SUFFIX = '/edit';
// 시안 규격: + 버튼 56px 안의 아이콘 28px
const FAB_ICON_SIZE = 28;

// 아래에서 위로 쌓으므로 목록을 뒤집어 그린다. 첫 항목(가계부)이 + 버튼 바로 위, 엄지에 가장 가깝다
const DIAL_ITEMS = [...NEW_RECORD_MENU_ITEMS].reverse();

// 모바일 전용 작성 버튼. 메뉴라서 Radix DropdownMenu를 쓴다:
// 화살표 키로 항목 이동, Esc로 닫기, 닫으면 + 버튼으로 포커스가 돌아오는 동작이 따라온다
// cacheComponents: 아래에 id 같은 동적 주소가 있는 화면(/records/[id])에서는 미리 그릴 때 주소를 몰라 usePathname이 기다린다.
// Suspense로 감싸서 앱 틀은 미리 그리고, 기다리는 동안은 선택 표시 없는 아무것도 그리지 않는다 (떠 있는 버튼이라 늦게 나타나도 화면이 밀리지 않는다)
export default function SpeedDial() {
  return (
    <Suspense fallback={null}>
      <SpeedDialWithPathname />
    </Suspense>
  );
}

function SpeedDialWithPathname() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // 작성·수정 중에는 숨긴다 (CLAUDE.md: 입력 중 스피드 다이얼 숨김)
  if (
    pathname.startsWith(NEW_RECORD_PATH) ||
    pathname.endsWith(EDIT_PATH_SUFFIX)
  ) {
    return null;
  }

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      {/* 시안: 열리면 화면 전체를 어둡게. Radix 메뉴에는 덮개가 없어서 직접 깐다. 바깥을 누르면 메뉴가 닫힌다 */}
      {isOpen && (
        <div
          aria-hidden='true'
          className='fixed inset-0 z-30 bg-overlay md:hidden'
        />
      )}
      <DropdownMenu.Trigger
        aria-label={isOpen ? '새 기록 메뉴 닫기' : '새 기록 쓰기'}
        // 하단 탭 위 16px. --tab-bar-height에 홈 막대 여백이 들어 있다
        className={`fixed right-4 bottom-[calc(var(--tab-bar-height)+16px)] z-40 flex size-14 items-center justify-center rounded-full shadow-float md:hidden ${
          isOpen
            ? 'bg-surface-raised text-fg-primary'
            : 'bg-accent text-accent-foreground'
        }`}
      >
        {isOpen ? (
          <X
            aria-hidden='true'
            size={FAB_ICON_SIZE}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        ) : (
          <Plus
            aria-hidden='true'
            size={FAB_ICON_SIZE}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side='top'
          align='end'
          sideOffset={12}
          className='z-40 flex flex-col items-end gap-3 outline-none md:hidden'
        >
          {DIAL_ITEMS.map((item) => {
            const style = RECORD_TYPE_STYLE[item.type];
            const Icon = style.icon;
            return (
              // asChild: 메뉴 항목 동작(키보드·포커스)은 Radix, 이동은 Next Link가 맡는다
              <DropdownMenu.Item key={item.type} asChild>
                <Link
                  href={item.href}
                  // 라벨과 동그라미 모두 누를 수 있게 한 줄 전체가 링크 (시안 3번)
                  className='group flex items-center gap-3 rounded-full outline-none'
                >
                  <span className='flex h-11 items-center rounded-full bg-surface-raised px-4 text-body-sm font-semibold text-fg-primary shadow-float group-data-highlighted:ring-2 group-data-highlighted:ring-focus-ring'>
                    {item.label}
                  </span>
                  <span
                    className={`flex size-12 items-center justify-center rounded-full shadow-float ${style.subtleBgClass} ${style.textClass}`}
                  >
                    <Icon
                      aria-hidden='true'
                      size={ICON_SIZE.lg}
                      strokeWidth={ICON_STROKE_WIDTH}
                    />
                  </span>
                </Link>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
