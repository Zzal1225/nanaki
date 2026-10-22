'use client';

// 'use client' 이유: 서비스 워커에 메시지를 보내고, 브라우저 캐시(Cache Storage)에 무엇이 있는지 본다
import { useSerwist } from '@serwist/turbopack/react';
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

// 아직 저장되지 않은 화면만 서비스 워커에 받아 두라고 한다. 이미 있으면 요청을 보내지 않는다
// (새 배포가 오면 서비스 워커가 옛 화면 캐시를 지우므로 그때 다시 받는다)
export default function OfflineWarmup() {
  const { serwist } = useSerwist();

  useEffect(() => {
    if (!serwist || !('caches' in window)) return;
    const timer = window.setTimeout(async () => {
      if (!navigator.onLine) return;
      const missing: string[] = [];
      for (const path of WARMUP_PATHS) {
        if (!(await caches.match(path, { ignoreSearch: true }))) {
          missing.push(path);
        }
      }
      if (missing.length === 0) return;
      // CACHE_URLS: 서비스 워커가 각 주소를 평소 규칙(화면 HTML 저장)대로 받아 둔다 (Serwist 기본 메시지)
      void serwist.messageSW({
        type: 'CACHE_URLS',
        payload: { urlsToCache: missing },
      });
    }, WARMUP_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [serwist]);

  return null;
}
