'use client';

// 'use client' 이유: 브라우저 캐시(Cache Storage)에 무엇이 있는지 보고, 없는 화면을 받아 둔다
import { useEffect } from 'react';
import { RECORD_TYPE_ORDER } from '@/features/records/entry/newRecordMenu';
import { RECORD_TEMPLATE_ID } from '@/lib/offlinePages';

// 로그인 뒤 미리 받아 둘 화면 (25c-2). 연 적 없는 화면도 오프라인에서 열리게:
// - 고정 화면: 홈·기록 탭·검색·작성·설정
// - 타입 상세 5개 (타입 이름이 HTML에 들어가서 타입마다 한 장)
// - 기록 상세·수정의 틀 한 장씩 (기록마다 HTML이 같아서 틀 하나로 모든 기록을 연다, src/sw/sw.ts)
// 로그인 화면에서 서비스 워커가 설치될 때 받으면 세션이 없어 로그인 화면이 저장되므로, 로그인 뒤 앱 틀에서 받는다
export const WARMUP_PATHS: readonly string[] = [
  '/',
  '/records',
  '/records/search',
  '/records/new',
  '/settings',
  ...RECORD_TYPE_ORDER.map((type) => `/records/type/${type}`),
  `/records/${RECORD_TEMPLATE_ID}`,
  `/records/${RECORD_TEMPLATE_ID}/edit`,
];

// 앱을 연 직후에는 첫 화면 요청과 겹치지 않게 조금 미룬다
const WARMUP_DELAY_MS = 3_000;

// 아직 저장되지 않은 화면만 받는다. 페이지에서 fetch하면 서비스 워커가 가로채 화면 저장 규칙대로 담는다.
// (서비스 워커에 "이 주소들을 받아 둬"라는 메시지(CACHE_URLS)를 보내는 방법은 쓰지 않는다: 메시지가 갔는지·저장됐는지
//  페이지에서 알 수 없고, 같은 규칙을 거치는 fetch가 더 단순하다)
// 이미 있는지는 주소 그대로 찾는다: ?를 무시하면 Next가 미리 받아 둔 화면 조각(/records?_rsc=…)까지 같은 주소로 쳐서
// "이미 있다"고 잘못 판단한다 (25c-2 E2E에서 실제로 미리 받기가 하나도 일어나지 않았다)
export default function OfflineWarmup() {
  useEffect(() => {
    if (!('caches' in window) || !('serviceWorker' in navigator)) return;
    let isCancelled = false;
    const timer = window.setTimeout(async () => {
      // 서비스 워커가 이 페이지를 맡고 있어야 fetch가 가로채져 저장된다. 아직이면 다음에 앱을 열 때
      if (!navigator.onLine || !navigator.serviceWorker.controller) return;
      for (const path of WARMUP_PATHS) {
        if (isCancelled) return;
        if (await caches.match(path)) continue;
        // 하나씩: 한꺼번에 보내면 화면을 쓰는 동안 요청이 몰린다. 실패는 다음 기회에
        await fetch(path, { credentials: 'same-origin' }).catch(() => {});
      }
    }, WARMUP_DELAY_MS);
    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
