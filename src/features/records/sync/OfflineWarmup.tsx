'use client';

// 'use client' 이유: 브라우저의 서비스 워커에 메시지를 보내고, 연결·서비스 워커 바뀜 이벤트를 듣는다
import { useEffect } from 'react';
import { RECORD_TYPE_ORDER } from '@/features/records/entry/newRecordMenu';
import { WARM_PAGES_MESSAGE, type WarmPagesMessage } from '@/lib/offlinePages';

// 로그인 뒤 미리 받아 둘 화면 (25c-2). 연 적 없는 화면도 오프라인에서 열리게:
// - 고정 화면: 홈·기록 탭·검색·작성·설정
// - 타입 상세 5개 (타입 이름이 HTML에 들어가서 타입마다 한 장)
// - 기록 상세·수정 (기록 id가 ?id=라 HTML이 기록마다 같다 → 한 장으로 모든 기록을 연다, features/records/routes)
// 로그인 화면에서 서비스 워커가 설치될 때 받으면 세션이 없어 로그인 화면이 저장되므로, 로그인 뒤 앱 틀에서 받는다
export const WARMUP_PATHS: readonly string[] = [
  '/',
  '/records',
  '/records/search',
  '/records/new',
  '/settings',
  ...RECORD_TYPE_ORDER.map((type) => `/records/type/${type}`),
  '/records/view',
  '/records/edit',
  // 예산 (33b). 달이 ?month=라 한 장으로 모든 달을 연다. 오프라인에서는 보기만 (저장은 온라인 전용)
  '/budget',
  // 고정지출 (33d). 주소에 값이 없어 한 장
  '/fixed-expenses',
  // 나키 (step3). 오프라인에서 열면 "오프라인에서는 쓸 수 없어요" 안내와 검색으로 가는 길을 보여 준다
  '/naki',
];

// 앱을 연 직후에는 첫 화면 요청과 겹치지 않게 조금 미룬다
const WARMUP_DELAY_MS = 3_000;

// 받아 두는 일은 서비스 워커가 한다: 페이지는 주소 목록만 보낸다 (src/sw/sw.ts, warmPageCache).
// 예전에는 페이지가 caches.match로 확인하고 직접 fetch했는데, caches.match는 옛 버전 캐시까지 뒤진다.
// 배포 직후 "이미 있다"고 건너뛰거나 옛 서비스 워커가 옛 캐시에 담은 뒤, 새 버전이 옛 캐시를 지워서
// 받아 둔 화면이 하나도 없었다 (2026-10-22 아이폰 확인: 비행기 모드에서 작성 화면 대신 오프라인 대체 화면).
// 보내는 때:
// - 앱을 열고 조금 뒤 (첫 화면 요청과 겹치지 않게)
// - 새 버전 서비스 워커가 이 페이지를 맡았을 때(controllerchange): 새 버전의 캐시는 비어 있다
// - 연결이 돌아왔을 때(online): 오프라인으로 연 경우
// 여러 번 보내도 서비스 워커가 이미 있는 화면은 건너뛰어 요청이 늘지 않는다
export default function OfflineWarmup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const serviceWorker = navigator.serviceWorker;

    function requestWarmup() {
      // 아직 이 페이지를 맡은 서비스 워커가 없으면(처음 설치) controllerchange 때 보낸다
      if (!navigator.onLine || !serviceWorker.controller) return;
      const message: WarmPagesMessage = {
        type: WARM_PAGES_MESSAGE,
        paths: [...WARMUP_PATHS],
      };
      serviceWorker.controller.postMessage(message);
    }

    const timer = window.setTimeout(requestWarmup, WARMUP_DELAY_MS);
    serviceWorker.addEventListener('controllerchange', requestWarmup);
    window.addEventListener('online', requestWarmup);
    return () => {
      window.clearTimeout(timer);
      serviceWorker.removeEventListener('controllerchange', requestWarmup);
      window.removeEventListener('online', requestWarmup);
    };
  }, []);

  return null;
}
