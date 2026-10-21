import { useSyncExternalStore } from 'react';
import { toLocalDateString } from './toLocalDateString';

// 날짜는 바깥에서 "바뀐다"고 알려 주는 저장소가 아니라서 구독할 것이 없다
function subscribe(): () => void {
  return () => {};
}

// 같은 날에는 같은 글자라서 렌더마다 새 값으로 보이지 않는다 (Date 객체를 돌려주면 매번 달라져 무한 렌더)
function getTodaySnapshot(): string {
  return toLocalDateString(new Date());
}

// 서버(미리 그리기)에서는 "오늘"을 모른다. 사용자의 시간대도 모르고, cacheComponents는 미리 그릴 때 new Date()를 막는다
function getServerSnapshot(): null {
  return null;
}

// 브라우저에서만 오늘 날짜('YYYY-MM-DD')를 준다. 서버와 첫 하이드레이션에서는 null → 그동안 자리만 보여 준다.
// 화면을 켜 둔 채 자정을 넘기는 경우는 다음에 다시 그려질 때 반영된다
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, getTodaySnapshot, getServerSnapshot);
}
