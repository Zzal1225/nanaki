import { House, List, Settings, Sparkles, type LucideIcon } from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  hasAiBadge?: boolean;
};

// 사이드바와 하단 탭이 같은 목록을 쓴다. 메뉴를 바꿀 때 여기 한 곳만 고친다
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: '홈', icon: House },
  { href: '/records', label: '기록', icon: List },
  { href: '/naki', label: '나키', icon: Sparkles, hasAiBadge: true },
];

// 모바일은 홈 화면의 ⚙로 가고, 태블릿·PC는 사이드바 맨 아래에 둔다
export const SETTINGS_ITEM: NavItem = {
  href: '/settings',
  label: '설정',
  icon: Settings,
};
