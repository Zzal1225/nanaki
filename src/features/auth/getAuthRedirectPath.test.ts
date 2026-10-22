import { describe, expect, it } from 'vitest';
import {
  HOME_PATH,
  LOGIN_PATH,
  getAuthRedirectPath,
} from './getAuthRedirectPath';

describe('getAuthRedirectPath', () => {
  it('로그인 안 한 사람은 홈 화면에 가면 로그인 화면으로 보내진다', () => {
    expect(getAuthRedirectPath(HOME_PATH, false)).toBe(LOGIN_PATH);
  });
  it('로그인 안 한 사람은 로그인 화면을 그냥 볼 수 있다', () => {
    expect(getAuthRedirectPath(LOGIN_PATH, false)).toBe(null);
  });
  it('로그인 안 한 사람은 callback 화면을 볼 수 있다', () => {
    expect(getAuthRedirectPath('/auth/callback', false)).toBe(null);
  });
  it('로그인 안 한 사람은 디자인 시스템을 볼 수 있다', () => {
    expect(getAuthRedirectPath('/design-system', false)).toBe(null);
  });
  it('로그인 한 사람은 홈 화면을 볼 수 있다', () => {
    expect(getAuthRedirectPath(HOME_PATH, true)).toBe(null);
  });
  it('로그인 한 사람은 로그인 화면에 가면 홈 화면으로 보내진다', () => {
    expect(getAuthRedirectPath(LOGIN_PATH, true)).toBe(HOME_PATH);
  });
  it('로그인 한 사람은 디자인 시스템을 볼 수 있다', () => {
    expect(getAuthRedirectPath('/design-system', true)).toBe(null);
  });
  it('robots.txt는 로그인 없이 읽을 수 있다 (검색 로봇)', () => {
    expect(getAuthRedirectPath('/robots.txt', false)).toBe(null);
  });
  // 서비스 워커·설치는 로그인 화면에서 시작된다. 로그인 화면 HTML이 대신 저장되면 안 된다
  it('서비스 워커 파일·매니페스트·오프라인 화면은 로그인 없이 받을 수 있다', () => {
    expect(getAuthRedirectPath('/serwist/sw.js', false)).toBe(null);
    expect(getAuthRedirectPath('/manifest.webmanifest', false)).toBe(null);
    expect(getAuthRedirectPath('/~offline', false)).toBe(null);
  });
  // API는 로그인 화면으로 보내지 않는다. 대신 각 API가 401을 준다
  it('API는 로그인 여부와 상관없이 보내지 않는다', () => {
    expect(getAuthRedirectPath('/api/account', false)).toBe(null);
    expect(getAuthRedirectPath('/api/account', true)).toBe(null);
  });
  it('/api로 시작하는 화면 이름은 그대로 보호된다', () => {
    expect(getAuthRedirectPath('/apiary', false)).toBe(LOGIN_PATH);
  });
  // 공개 목록에 등록하지 않은 새 화면도 자동으로 보호되는지 확인한다 (기본 거부)
  it('로그인 안 한 사람은 앞으로 생길 주소에 갈 수 없다', () => {
    expect(getAuthRedirectPath('/records/abc', false)).toBe(LOGIN_PATH);
  });
});
