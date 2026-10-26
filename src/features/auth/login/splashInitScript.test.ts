// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SPLASH_CONTINUE_KEY,
  SPLASH_CONTINUED_ATTR,
  SPLASH_INIT_SCRIPT,
  SPLASH_SKIP_ATTR,
} from './splashRules';

// <head>에서 문자열로 실행되는 스크립트라 타입 검사를 받지 않는다 → 실제로 돌려서 붙이는 표시를 본다
function runScript() {
  new Function(SPLASH_INIT_SCRIPT)();
}

describe('SPLASH_INIT_SCRIPT (<head>, 첫 그리기 전)', () => {
  const root = document.documentElement;
  afterEach(() => {
    root.removeAttribute(SPLASH_CONTINUED_ATTR);
    root.removeAttribute(SPLASH_SKIP_ATTR);
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('보통은 아무 표시도 붙이지 않는다 (등장 동작으로 보인다)', () => {
    runScript();
    expect(root.hasAttribute(SPLASH_CONTINUED_ATTR)).toBe(false);
    expect(root.hasAttribute(SPLASH_SKIP_ATTR)).toBe(false);
  });

  it('로그인 버튼을 누르고 왔으면 이어지기 표시', () => {
    sessionStorage.setItem(SPLASH_CONTINUE_KEY, '1');
    runScript();
    expect(root.hasAttribute(SPLASH_CONTINUED_ATTR)).toBe(true);
  });

  it('오프라인으로 열면 숨김 표시', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    runScript();
    expect(root.hasAttribute(SPLASH_SKIP_ATTR)).toBe(true);
  });
});
