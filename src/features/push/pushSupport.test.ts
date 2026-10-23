import { describe, expect, it } from 'vitest';
import {
  base64UrlToBytes,
  getPushSupport,
  type PushEnvironment,
} from './pushSupport';

const FULL: PushEnvironment = {
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  isAppleMobile: false,
  isStandalone: false,
  permission: 'default',
};

describe('이 기기에서 푸시를 받을 수 있는지', () => {
  it('PC·안드로이드 브라우저는 탭에서도 된다', () => {
    expect(getPushSupport(FULL)).toBe('supported');
  });

  it('아이폰은 홈 화면 앱에서만 (Safari 탭이면 추가하라고)', () => {
    const iphoneTab = {
      ...FULL,
      isAppleMobile: true,
      hasPushManager: false,
    };
    expect(getPushSupport(iphoneTab)).toBe('needsInstall');
    expect(
      getPushSupport({ ...FULL, isAppleMobile: true, isStandalone: true }),
    ).toBe('supported');
  });

  it('필요한 API가 없으면 지원 안 함, 한 번 거절했으면 차단됨', () => {
    expect(getPushSupport({ ...FULL, hasPushManager: false })).toBe(
      'unsupported',
    );
    expect(getPushSupport({ ...FULL, permission: 'denied' })).toBe('denied');
  });
});

describe('VAPID 공개 키 → 바이트', () => {
  it('base64url(-_, = 없음)을 바이트로', () => {
    // [251, 255] = base64 "+/8=" = base64url "-_8"
    expect([...base64UrlToBytes('-_8')]).toEqual([251, 255]);
    expect([...base64UrlToBytes('AQID')]).toEqual([1, 2, 3]);
  });
});
