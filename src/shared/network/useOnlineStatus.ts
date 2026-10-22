import { useSyncExternalStore } from 'react';

// 브라우저가 아는 연결 상태 (navigator.onLine + online/offline 이벤트).
// useSyncExternalStore: 브라우저 값을 React 상태처럼 구독한다 (useEffect로 따라가면 첫 그림과 한 번 어긋난다).
// 서버에서 그릴 때는 알 수 없어서 온라인으로 본다 → 오프라인 배너가 서버 HTML에 박히지 않는다.
// 함정: onLine이 true여도 실제로 서버에 닿는다는 보장은 없다(와이파이만 붙고 인터넷은 안 되는 경우).
// 그래서 저장·보내기는 이 값에 기대지 않고 실패로 판단한다(recordOutbox). 이 값은 화면 안내에만 쓴다
function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
