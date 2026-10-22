import { defaultCache } from '@serwist/turbopack/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { NetworkOnly, Serwist } from 'serwist';

// 서비스 워커: 브라우저와 네트워크 사이에서 요청을 가로채, 연결이 없어도 화면 틀(HTML·JS·CSS)을 내준다.
// 기록 데이터는 여기서 저장하지 않는다 (25b에서 IndexedDB 사본). 여기는 "화면을 여는 것"만 맡는다.
// 앱 코드와 따로 esbuild로 묶여 /serwist/sw.js로 나간다 (src/app/serwist/[path]/route.ts)

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // 빌드가 채워 넣는 미리 받을 파일 목록 (.next/static의 JS·CSS 등)
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// 연결이 없고 저장해 둔 화면도 없을 때 보여 줄 화면
const OFFLINE_FALLBACK_PATH = '/~offline';

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // 새 버전이 오면 기다리지 않고 바로 바꾼다. 화면 틀만 다루므로 옛 탭과 섞여도 데이터가 깨지지 않는다
  skipWaiting: true,
  clientsClaim: true,
  // 서비스 워커가 깨어나는 동안 페이지 요청을 먼저 보내 둔다 (온라인 첫 화면이 느려지지 않게)
  navigationPreload: true,
  runtimeCaching: [
    // 다른 도메인(Supabase·Sentry)은 저장하지 않는다. 기본 규칙은 다른 도메인 응답도 1시간 저장하는데,
    // Supabase 응답은 기록·계정 같은 개인 데이터라 캐시에 남기면 로그아웃 뒤에도 기기에 남는다.
    // 오프라인 데이터는 25b의 IndexedDB 사본이 맡는다 (로그아웃 때 지우는 위치를 한 곳으로)
    {
      matcher: ({ sameOrigin }) => !sameOrigin,
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: OFFLINE_FALLBACK_PATH,
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

serwist.addEventListeners();
