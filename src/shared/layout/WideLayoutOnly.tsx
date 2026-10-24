'use client';

// 'use client' 이유: 화면 너비(matchMedia)는 브라우저에서만 안다
import { useSyncExternalStore, type ReactNode } from 'react';

// Tailwind lg와 같은 값 (CLAUDE.md: 1024px 이상 PC). 이 값과 CSS의 lg:가 어긋나면 PC에서 빈 칸이 보인다
export const WIDE_LAYOUT_QUERY = '(min-width: 1024px)';

// matchMedia가 없는 환경(테스트의 jsdom 등)은 좁은 화면으로 본다: 숨은 목록을 그리지 않는 쪽이 안전하다
function hasMatchMedia(): boolean {
  return typeof window.matchMedia === 'function';
}

function subscribe(onChange: () => void): () => void {
  if (!hasMatchMedia()) return () => {};
  const query = window.matchMedia(WIDE_LAYOUT_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  return hasMatchMedia() && window.matchMedia(WIDE_LAYOUT_QUERY).matches;
}

// 서버(미리 그리기)는 너비를 모른다 → "그리지 않음"으로 시작한다. 첫 하이드레이션도 같은 값이라 서버 HTML과 어긋나지 않는다
function getServerSnapshot(): boolean {
  return false;
}

// PC에서만 보이는 무거운 칸(기록 layout의 왼쪽 목록)을 PC에서만 "그린다".
// 보이고 숨기는 것은 여전히 CSS(hidden lg:block)가 맡고, 이것은 숨은 쪽에서 그리기·조회를 하지 않게 할 뿐이다.
// 모바일 기록 화면이 CSS로 숨긴 PC 목록(기록 탭 첫 화면·검색 결과 최대 300개)을 한 벌 더 그리고 조회하고 있었다
// (2026-10-24, 41 1만 건 측정에서 검색 폼이 두 개인 것을 보고 찾음).
// CLAUDE.md의 "useMediaQuery로 다른 컴포넌트를 렌더하지 않는다"는 하이드레이션 불일치 때문인데, 여기는 서버와 첫 렌더가 모두
// 빈 칸이라 불일치가 없고, 배치를 바꾸는 것이 아니라 숨은 것을 그리지 않는 것이다.
// 감수: PC에서는 하이드레이션 직후 한 번 더 그려야 왼쪽 목록이 나온다(그 목록도 기기 사본을 읽은 뒤에야 내용이 차서 차이는 작다)
export default function WideLayoutOnly({ children }: { children: ReactNode }) {
  const isWide = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return isWide ? children : null;
}
