// 이 기기에서 푸시 알림을 받을 수 있는지 (35a). 판단은 순수 함수, 브라우저 값 읽기는 readPushEnvironment 하나로 나눠 테스트한다.
// 기기 능력 분기라 마운트 뒤에 판단한다 (CLAUDE.md: 판단 전에는 그 UI를 숨긴 상태로 시작)

export type PushSupport =
  'supported' | 'needsInstall' | 'unsupported' | 'denied';

export type PushEnvironment = {
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  // 아이폰·아이패드: 웹 푸시는 홈 화면에 추가한 앱에서만 된다 (iOS 16.4+). Safari 탭에는 PushManager가 없다
  isAppleMobile: boolean;
  isStandalone: boolean;
  permission: NotificationPermission | null;
};

export function getPushSupport(env: PushEnvironment): PushSupport {
  // 아이폰 Safari 탭은 "지원 안 함"이 아니라 "홈 화면에 추가하면 된다"고 알려 준다
  if (env.isAppleMobile && !env.isStandalone) return 'needsInstall';
  if (!env.hasServiceWorker || !env.hasPushManager || !env.hasNotification) {
    return 'unsupported';
  }
  // 한 번 거절하면 브라우저가 다시 묻지 않는다 → 설정에서 허용하라고 안내
  if (env.permission === 'denied') return 'denied';
  return 'supported';
}

export const PUSH_UNAVAILABLE_MESSAGE: Record<
  Exclude<PushSupport, 'supported'>,
  string
> = {
  needsInstall: '아이폰은 홈 화면에 추가한 앱에서만 알림을 받을 수 있어요',
  unsupported: '이 브라우저는 알림을 지원하지 않아요',
  denied: '알림이 차단돼 있어요. 브라우저 설정에서 nanaki 알림을 허용해 주세요',
};

// 브라우저에서만 부른다 (서버 렌더링 중에는 navigator가 없다)
export function readPushEnvironment(): PushEnvironment {
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    hasServiceWorker: 'serviceWorker' in navigator,
    hasPushManager: 'PushManager' in window,
    hasNotification: 'Notification' in window,
    // iPadOS는 Mac처럼 보이는 UA를 보낸다 → 터치 지점이 있는 Mac은 아이패드로 본다
    isAppleMobile:
      /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    isStandalone:
      window.matchMedia('(display-mode: standalone)').matches ||
      nav.standalone === true,
    permission: 'Notification' in window ? Notification.permission : null,
  };
}

// VAPID 공개 키(base64url 문자열) → pushManager.subscribe가 받는 바이트.
// base64url은 +/ 대신 -_를 쓰고 끝의 = 채움을 뺀다 → atob가 읽게 되돌린다
export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
