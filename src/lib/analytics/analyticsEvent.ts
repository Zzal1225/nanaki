import type { BeforeSendEvent } from '@vercel/analytics/next';

// 방문 집계(Vercel Web Analytics)로 나가기 직전의 이벤트를 고른다.
// SDK와 브라우저 저장소에서 떼어 놓아 "무엇이 나가지 않는지"를 단위 테스트로 확인한다 (sentryOptions와 같은 방식)

// 이 값이 저장된 기기는 집계하지 않는다. 궁금한 것은 다른 사람의 방문이라 내 접속이 섞이면 숫자를 믿을 수 없다.
// 콘솔에서 localStorage.setItem('va-disable', '1') 한 번이면 된다 (설정 화면에 두지 않는 이유: 사용자에게는 필요 없는 개발자용 스위치)
const OPT_OUT_STORAGE_KEY = 'va-disable';

// 주소의 ?뒤는 보내지 않는다: 기록 id(/records/view?id=), 검색어(/records/search?q=), 고른 날짜처럼 기록 내용이 들어 있다.
// 어느 화면을 봤는지는 경로만으로 충분하다. 파싱 못 하는 주소는 무엇이 들었는지 모르므로 보내지 않는다
export function sanitizeAnalyticsEvent(
  event: BeforeSendEvent,
  isOptedOut: boolean,
): BeforeSendEvent | null {
  if (isOptedOut) return null;
  try {
    const { origin, pathname } = new URL(event.url);
    return { ...event, url: `${origin}${pathname}` };
  } catch {
    return null;
  }
}

// 시크릿 창 등에서 저장소 접근이 막히면 던질 수 있다. 집계 때문에 화면이 깨지면 안 되므로 "제외 안 함"으로 본다
export function readAnalyticsOptOut(): boolean {
  try {
    return localStorage.getItem(OPT_OUT_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}
