import type { PushSetupResult } from './api/pushStore';
import { PUSH_UNAVAILABLE_MESSAGE } from './pushSupport';

// 알림 켜기 결과 → 사용자 안내 (받는 중이면 안내 없음).
// 루틴 폼의 알림 칸과 설정의 "이 기기 루틴 알림"이 같은 문구를 쓰게 한 곳에 둔다
export function pushSetupMessage(result: PushSetupResult): string | null {
  switch (result) {
    case 'subscribed':
      return null;
    case 'notConfigured':
    case 'failed':
      return '이 기기에서 알림을 켜지 못했어요. 잠시 후 다시 시도해 주세요';
    default:
      return PUSH_UNAVAILABLE_MESSAGE[result];
  }
}
