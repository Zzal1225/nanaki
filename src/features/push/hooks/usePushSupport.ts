import { useSyncExternalStore } from 'react';
import {
  getPushSupport,
  readPushEnvironment,
  type PushSupport,
} from '../pushSupport';

// 기기·권한이 바뀌었다고 알려 주는 이벤트가 없어 구독할 것이 없다.
// 권한은 켜기(허용 창) 뒤 다시 그릴 때 새로 읽힌다 (값이 글자라 같으면 다시 그리지 않는다)
function subscribe(): () => void {
  return () => {};
}

function getSnapshot(): PushSupport {
  return getPushSupport(readPushEnvironment());
}

// 서버(미리 그리기)는 기기를 모른다 → null: 판단 전에는 알림 줄을 그리지 않는다 (CLAUDE.md: 기기 능력 분기는 마운트 뒤)
function getServerSnapshot(): PushSupport | null {
  return null;
}

// 이 기기에서 웹 푸시를 받을 수 있는지 (설정의 "이 기기 루틴 알림" 스위치를 켤 수 있는지)
export function usePushSupport(): PushSupport | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
