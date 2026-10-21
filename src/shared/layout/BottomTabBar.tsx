'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import AiBadge from './AiBadge';
import { isActivePath } from './isActivePath';
import { NAV_ITEMS } from './navItems';

// 'use client'인 이유: 지금 주소(usePathname)로 선택된 탭을 표시해야 한다.
// 모바일 전용. 높이는 탭 56px + 기기의 홈 바 여백(--tab-bar-height)
// cacheComponents: 아래에 id 같은 동적 주소가 있는 화면(/records/[id])에서는 미리 그릴 때 주소를 몰라 usePathname이 기다린다.
// Suspense로 감싸서 앱 틀은 미리 그리고, 기다리는 동안은 선택 표시 없는 같은 모양(pathname = null)을 먼저 보여 준다
export default function BottomTabBar() {
  return (
    <Suspense fallback={<BottomTabBarView pathname={null} />}>
      <BottomTabBarWithPathname />
    </Suspense>
  );
}

function BottomTabBarWithPathname() {
  return <BottomTabBarView pathname={usePathname()} />;
}

function BottomTabBarView({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label='주요 메뉴'
      className='fixed inset-x-0 bottom-0 z-10 h-(--tab-bar-height) border-t border-border bg-surface-raised pb-[env(safe-area-inset-bottom)] md:hidden'
    >
      <ul className='flex h-full'>
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname !== null && isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className='flex-1'>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-caption ${
                  isActive
                    ? 'font-semibold text-accent'
                    : 'font-medium text-fg-secondary'
                }`}
              >
                <Icon
                  aria-hidden='true'
                  size={ICON_SIZE.lg}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
                <span className='relative'>
                  {item.label}
                  {item.hasAiBadge && (
                    <AiBadge className='absolute -top-2 left-full' />
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
