import { useSyncExternalStore } from 'react';
import { canUseInAppCamera } from '../photoCapture';

// 손가락 기기인지는 기기를 바꾸지 않는 한 그대로라 구독할 것이 없다 (바뀌면 다음에 다시 그릴 때 반영)
function subscribe(): () => void {
  return () => {};
}

function getSnapshot(): boolean {
  return canUseInAppCamera({
    // http 주소(보안 연결 아님)에서는 mediaDevices 자체가 없다
    hasGetUserMedia: typeof navigator.mediaDevices?.getUserMedia === 'function',
    // matchMedia가 없는 환경(아주 오래된 브라우저, 테스트의 jsdom)은 손가락 기기로 보지 않는다 → 파일 고르기
    isCoarsePointer:
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches,
  });
}

// 서버(미리 그리기)는 기기를 모른다 → false: 카메라 대신 파일 고르기로 그린다.
// CLAUDE.md: 기기 능력 분기는 마운트 뒤 판단하고, 판단 전에는 해당 UI(카메라)를 숨긴 채 시작한다
function getServerSnapshot(): boolean {
  return false;
}

// 앱 안 카메라(촬영 가이드)를 쓸 기기인지 (step4 37c2)
export function useInAppCamera(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
