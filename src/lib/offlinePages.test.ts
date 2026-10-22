import { describe, expect, it } from 'vitest';
import {
  isPagePath,
  RECORD_TEMPLATE_ID,
  templatePathFor,
} from './offlinePages';

describe('연 적 없는 화면의 틀', () => {
  it('기록 상세·수정은 틀 주소로', () => {
    expect(templatePathFor('/records/abc')).toBe(
      `/records/${RECORD_TEMPLATE_ID}`,
    );
    expect(templatePathFor('/records/abc/edit')).toBe(
      `/records/${RECORD_TEMPLATE_ID}/edit`,
    );
  });
  it('같은 자리의 다른 화면과 틀이 없는 화면은 null', () => {
    expect(templatePathFor('/records/new')).toBeNull();
    expect(templatePathFor('/records/search')).toBeNull();
    expect(templatePathFor('/records/type/expense')).toBeNull();
    expect(templatePathFor('/')).toBeNull();
  });
});

describe('화면 HTML 요청', () => {
  it('화면 주소는 맞고, 파일·API·콜백·서비스 워커 파일은 아니다', () => {
    expect(isPagePath('/')).toBe(true);
    expect(isPagePath('/records/abc/edit')).toBe(true);
    expect(isPagePath('/~offline')).toBe(true);
    expect(isPagePath('/robots.txt')).toBe(false);
    expect(isPagePath('/manifest.webmanifest')).toBe(false);
    expect(isPagePath('/_next/static/chunks/a.js')).toBe(false);
    expect(isPagePath('/api/account')).toBe(false);
    expect(isPagePath('/auth/callback')).toBe(false);
    expect(isPagePath('/serwist/sw.js')).toBe(false);
  });
});
