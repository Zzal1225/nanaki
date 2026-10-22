import { SETTINGS_ITEM } from './navItems';

// 설정으로 들어온 화면. 설정의 ‹가 그 화면으로 돌아간다 (?from=records)
export type SettingsOrigin = 'home' | 'records';

// 돌아갈 수 있는 곳만 정해 둔다: ?from=에 아무 주소나 받아 그대로 이동하면 주소를 고쳐 다른 사이트로 보낼 수 있다(열린 리다이렉트)
const ORIGIN_HREF: Record<SettingsOrigin, string> = {
  home: '/',
  records: '/records',
};

// 홈은 기본값이라 주소에 붙이지 않는다 (예전 주소 /settings 그대로)
export function settingsHref(origin: SettingsOrigin): string {
  return origin === 'home'
    ? SETTINGS_ITEM.href
    : `${SETTINGS_ITEM.href}?from=${origin}`;
}

// ?from= 값 → 돌아갈 주소. 모르는 값이면 홈
export function settingsBackHref(from: string | null): string {
  return from === 'records' ? ORIGIN_HREF.records : ORIGIN_HREF.home;
}
