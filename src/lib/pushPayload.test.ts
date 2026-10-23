import { describe, expect, it } from 'vitest';
import { parsePushPayload } from './pushPayload';

describe('푸시 알림 내용 읽기 (서비스 워커)', () => {
  it('보낸 내용 그대로', () => {
    expect(
      parsePushPayload({
        title: '물 마시기',
        body: '오늘 아직 안 했어요',
        url: '/?date=2026-10-23',
        tag: 'routine-1',
      }),
    ).toEqual({
      title: '물 마시기',
      body: '오늘 아직 안 했어요',
      url: '/?date=2026-10-23',
      tag: 'routine-1',
    });
  });

  it('모양이 틀려도 알림은 띄운다 (기본 제목, 홈으로)', () => {
    expect(parsePushPayload(null)).toEqual({
      title: 'nanaki',
      body: '',
      url: '/',
    });
    expect(parsePushPayload('글자')).toEqual({
      title: 'nanaki',
      body: '',
      url: '/',
    });
  });

  it('다른 사이트 주소는 받지 않는다 (앱 안 경로만)', () => {
    expect(parsePushPayload({ url: 'https://evil.example' }).url).toBe('/');
    expect(parsePushPayload({ url: '//evil.example' }).url).toBe('/');
  });
});
