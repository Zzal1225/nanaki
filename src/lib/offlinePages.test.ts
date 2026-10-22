import { describe, expect, it } from 'vitest';
import { isPagePath } from './offlinePages';

describe('화면 HTML 요청', () => {
  it('화면 주소는 맞고, 파일·API·콜백·서비스 워커 파일은 아니다', () => {
    expect(isPagePath('/')).toBe(true);
    expect(isPagePath('/records/view')).toBe(true);
    expect(isPagePath('/~offline')).toBe(true);
    expect(isPagePath('/robots.txt')).toBe(false);
    expect(isPagePath('/manifest.webmanifest')).toBe(false);
    expect(isPagePath('/_next/static/chunks/a.js')).toBe(false);
    expect(isPagePath('/api/account')).toBe(false);
    expect(isPagePath('/auth/callback')).toBe(false);
    expect(isPagePath('/serwist/sw.js')).toBe(false);
  });
});
