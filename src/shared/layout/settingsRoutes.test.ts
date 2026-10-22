import { describe, expect, it } from 'vitest';
import { settingsBackHref, settingsHref } from './settingsRoutes';

describe('설정 주소', () => {
  it('들어온 곳을 ?from=에 담고, 홈은 붙이지 않는다', () => {
    expect(settingsHref('home')).toBe('/settings');
    expect(settingsHref('records')).toBe('/settings?from=records');
  });

  // 아무 주소나 받아 이동하면 주소를 고쳐 다른 사이트로 보낼 수 있다
  it('정해 둔 곳만 돌아가고, 나머지는 홈', () => {
    expect(settingsBackHref('records')).toBe('/records');
    expect(settingsBackHref(null)).toBe('/');
    expect(settingsBackHref('https://evil.example')).toBe('/');
  });
});
