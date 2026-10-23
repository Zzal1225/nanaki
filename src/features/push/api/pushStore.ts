import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  base64UrlToBytes,
  getPushSupport,
  readPushEnvironment,
  type PushSupport,
} from '../pushSupport';

// 이 기기의 푸시 구독을 저장·삭제하는 유일한 입구 (35a). 화면·훅은 pushManager·Supabase를 직접 부르지 않는다.
// 구독은 기기 단위다 (CLAUDE.md): 휴대폰·PC에서 각각 켜면 각각 저장되고, 보낼 때는 그 사람의 모든 구독으로 보낸다 (35b)

// VAPID 공개 키: 이 앱이 보낸 푸시만 이 구독으로 받게 하는 키 쌍의 공개 쪽 (비밀 쪽은 보내는 Edge Function에만, 35b).
// 빌드 때 코드에 박힌다. 없으면 이 환경에서는 알림을 켤 수 없다 (CI·로컬에 키를 안 넣었을 때)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export type PushSetupResult =
  | 'subscribed'
  | Exclude<PushSupport, 'supported'>
  // 이 배포에 공개 키가 없다
  | 'notConfigured'
  | 'failed';

export function isPushConfigured(): boolean {
  return VAPID_PUBLIC_KEY !== '';
}

// 이 기기에서 알림 받기를 켠다. 알림 권한을 묻는 브라우저 창이 뜰 수 있다.
// 버튼을 누른 처리 안에서 바로 불러야 한다: 아이폰은 사용자 동작 없이 권한을 물으면 무시한다 → requestPermission을 맨 먼저
export async function subscribeThisDevice(): Promise<PushSetupResult> {
  if (!isPushConfigured()) return 'notConfigured';
  const support = getPushSupport(readPushEnvironment());
  if (support !== 'supported') return support;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        // 받은 푸시는 늘 알림으로 보여 준다 (브라우저가 요구하는 약속, 조용한 푸시는 막혀 있다)
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY),
      }));
    const { endpoint, keys } = subscription.toJSON();
    if (!endpoint || !keys?.p256dh || !keys.auth) return 'failed';
    // 같은 기기가 다른 계정에 남아 있으면 지금 계정으로 옮긴다 (DB 함수 save_push_subscription)
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc('save_push_subscription', {
      p_endpoint: endpoint,
      p_p256dh: keys.p256dh,
      p_auth: keys.auth,
    });
    return error ? 'failed' : 'subscribed';
  } catch {
    return 'failed';
  }
}

// 이 기기에서 알림 받기를 끈다 (설정의 "끄기", 로그아웃 직전).
// 서버 줄을 지우고 브라우저 구독도 끊는다. 서버 삭제가 실패해도 브라우저 구독은 끊는다:
// 끊긴 주소로 보내면 410이 와서 보내는 쪽이 그 줄을 지운다 (35b) → 다른 사람의 알림이 이 기기에 남지 않는다
export async function unsubscribeThisDevice(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  const supabase = createSupabaseBrowserClient();
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', subscription.endpoint);
  await subscription.unsubscribe();
}

// 이 기기가 지금 알림을 받는 중인지 (브라우저 구독이 있고 권한이 허용됨).
// 서버 줄까지 확인하지는 않는다: 오프라인에서도 설정 화면이 열려야 한다
export async function isThisDeviceSubscribed(): Promise<boolean> {
  if (
    !('serviceWorker' in navigator) ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return false;
  }
  const registration = await navigator.serviceWorker.getRegistration();
  return Boolean(await registration?.pushManager.getSubscription());
}
