'use client';

import { useEffect } from 'react';

// 이 화면이 보이는 동안만 <body>에 클래스를 붙인다 (로그인 화면의 초록 바탕, 보고서 인쇄).
// CSS의 body:has([data-…])로 하지 않는 이유: cacheComponents는 떠난 화면을 지우지 않고 숨겨 DOM에 남겨 둔다.
// 그래서 로그인 뒤에도 숨은 로그인 화면이 남아 앱 전체 바탕이 초록이 됐다 (2026-10-24, #121 배포 뒤 PC 화면에서 발견).
// React는 화면을 숨길 때 그 화면의 effect를 정리(cleanup)하므로, effect로 붙인 클래스는 숨기는 순간 떨어진다
export function useBodyClass(className: string): void {
  useEffect(() => {
    document.body.classList.add(className);
    return () => document.body.classList.remove(className);
  }, [className]);
}
