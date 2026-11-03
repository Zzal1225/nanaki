import { describe, expect, it } from 'vitest';
import { sanitizeAnalyticsEvent } from './analyticsEvent';

describe('sanitizeAnalyticsEvent', () => {
  const pageview = (url: string) => ({ type: 'pageview' as const, url });

  it('검색어·기록 id가 든 주소의 ?뒤와 #뒤를 지운다', () => {
    expect(
      sanitizeAnalyticsEvent(
        pageview('https://nanaki.test/records/search?q=병원&type=expense#top'),
        false,
      ),
    ).toEqual(pageview('https://nanaki.test/records/search'));
    expect(
      sanitizeAnalyticsEvent(
        pageview('https://nanaki.test/records/view?id=abc'),
        false,
      ),
    ).toEqual(pageview('https://nanaki.test/records/view'));
  });

  it('경로만 있는 주소는 그대로 보낸다', () => {
    expect(
      sanitizeAnalyticsEvent(pageview('https://nanaki.test/login'), false),
    ).toEqual(pageview('https://nanaki.test/login'));
  });

  it('집계에서 뺀 기기는 보내지 않는다', () => {
    expect(
      sanitizeAnalyticsEvent(pageview('https://nanaki.test/login'), true),
    ).toBeNull();
  });

  it('읽지 못하는 주소는 보내지 않는다', () => {
    expect(sanitizeAnalyticsEvent(pageview('not a url'), false)).toBeNull();
  });
});
