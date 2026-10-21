'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Sprout } from 'lucide-react';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import AiBadge from './AiBadge';
import { isActivePath } from './isActivePath';
import { NAV_ITEMS, SETTINGS_ITEM, type NavItem } from './navItems';

// 시안의 메뉴 아이콘 크기 (일반 규격 20·24 사이의 내비게이션 전용 값)
const NAV_ICON_SIZE = 22;

// 'use client'인 이유: 지금 주소(usePathname)로 선택된 메뉴를 표시해야 한다.
// 태블릿(md)은 접힘 72px, PC(lg)는 펼침 240px. 폭에 따라 다른 컴포넌트를 그리지 않고 CSS로만 바꾼다
type SidebarProps = {
  // 로고 아래 주요 동작 자리("새 기록"). shared가 기록 기능(features)을 직접 import하지 않도록 바깥에서 넣어 준다
  action?: ReactNode;
};

export default function Sidebar({ action }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className='sticky top-0 hidden h-dvh w-(--sidebar-collapsed) shrink-0 flex-col gap-2 border-r border-border bg-surface px-3 py-4 md:flex lg:w-(--sidebar-expanded)'>
      <div className='flex h-12 items-center justify-center gap-3 lg:justify-start lg:px-2'>
        <span className='flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground'>
          <Sprout
            aria-hidden='true'
            size={ICON_SIZE.md}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </span>
        <span className='sr-only text-title font-bold text-fg-primary lg:not-sr-only'>
          nanaki
        </span>
      </div>

      {action && <div className='mt-2'>{action}</div>}

      <nav aria-label='주요 메뉴' className='mt-2'>
        <ul className='flex flex-col gap-1'>
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <SidebarLink
                item={item}
                isActive={isActivePath(pathname, item.href)}
              />
            </li>
          ))}
        </ul>
      </nav>

      <div className='mt-auto'>
        <SidebarLink
          item={SETTINGS_ITEM}
          isActive={isActivePath(pathname, SETTINGS_ITEM.href)}
        />
      </div>
    </aside>
  );
}

function SidebarLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={`relative mx-auto flex size-12 items-center justify-center rounded-md text-body lg:mx-0 lg:h-11 lg:w-full lg:justify-start lg:gap-3 lg:px-3 ${
        isActive
          ? 'bg-surface-hover font-semibold text-fg-primary'
          : 'font-medium text-fg-secondary hover:bg-surface-hover'
      }`}
    >
      <Icon
        aria-hidden='true'
        size={NAV_ICON_SIZE}
        strokeWidth={ICON_STROKE_WIDTH}
        className={isActive ? 'text-accent' : undefined}
      />
      {/* 접힌 상태에서는 글자를 숨기되 스크린 리더는 읽도록 sr-only를 쓴다 */}
      <span className='sr-only lg:not-sr-only'>{item.label}</span>
      {item.hasAiBadge && (
        <AiBadge className='absolute top-0.5 right-0 lg:static lg:-translate-y-2' />
      )}
    </Link>
  );
}
