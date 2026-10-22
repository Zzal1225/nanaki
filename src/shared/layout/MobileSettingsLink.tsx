import Link from 'next/link';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { SETTINGS_ITEM } from './navItems';
import { settingsHref, type SettingsOrigin } from './settingsRoutes';

// 모바일 화면 머리 오른쪽의 설정(⚙) 링크. 홈 캘린더 머리와 기록 탭 검색창 옆이 같은 모양·위치로 쓴다
// (2026-10-22 사용자 요청: 기록 탭에서도 홈처럼 설정으로 바로). 하단 탭에는 설정이 없어서(홈·기록·나키) 화면마다 둔다.
// md:hidden: 태블릿·PC는 사이드바 맨 아래에 설정이 있다 (navItems). 링크라서 서버 컴포넌트로 둔다
// origin: 설정의 ‹가 돌아올 화면
export default function MobileSettingsLink({
  origin,
}: {
  origin: SettingsOrigin;
}) {
  const SettingsIcon = SETTINGS_ITEM.icon;
  return (
    <Link
      href={settingsHref(origin)}
      aria-label={SETTINGS_ITEM.label}
      // 44px 터치 영역 (CLAUDE.md). 테두리 없는 아이콘 버튼: 머리의 주인공(제목·검색창)보다 조용하게
      className='inline-flex size-11 shrink-0 items-center justify-center rounded-md text-fg-primary hover:bg-surface-hover active:bg-surface-pressed md:hidden'
    >
      <SettingsIcon
        aria-hidden='true'
        size={ICON_SIZE.lg}
        strokeWidth={ICON_STROKE_WIDTH}
      />
    </Link>
  );
}
