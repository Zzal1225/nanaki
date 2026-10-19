'use client';

import { useLayoutEffect } from 'react';
import {
  DARK_MEDIA_QUERY,
  THEME_CHANGE_EVENT,
  applyTheme,
  readStoredTheme,
} from './theme';

// 'use client'인 이유: window, localStorage, matchMedia 같은 브라우저 API를 쓰기 때문
// 화면에 그리는 건 없고 <html>의 dark 클래스를 저장된 선택과 맞추는 일만 한다
export default function ThemeSync() {
  // useLayoutEffect인 이유: 개발 모드 Strict Mode가 <html>의 클래스를 지울 수 있어서
  // 화면이 그려지기 전에 다시 적용한다. 프로덕션에서는 인라인 스크립트가 이미 한 일이라 변화가 없다
  useLayoutEffect(() => {
    const mediaQuery = matchMedia(DARK_MEDIA_QUERY);
    // 어떤 이벤트가 오든 '저장된 선택 → 클래스'를 다시 계산하면 되므로 핸들러를 하나로 쓴다
    const sync = () => applyTheme(readStoredTheme());

    sync();
    mediaQuery.addEventListener('change', sync);
    window.addEventListener('storage', sync);
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => {
      mediaQuery.removeEventListener('change', sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener(THEME_CHANGE_EVENT, sync);
    };
  }, []);

  return null;
}
