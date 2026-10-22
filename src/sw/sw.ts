import { defaultCache } from '@serwist/turbopack/worker';
import type {
  PrecacheEntry,
  SerwistGlobalConfig,
  SerwistPlugin,
} from 'serwist';
import { ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from 'serwist';
import {
  isPagePath,
  PAGE_CACHE_PREFIX,
  templatePathFor,
} from '../lib/offlinePages';

// 서비스 워커: 브라우저와 네트워크 사이에서 요청을 가로채, 연결이 없어도 화면 틀(HTML·JS·CSS)을 내준다.
// 기록 데이터는 여기서 저장하지 않는다 (IndexedDB 사본, src/lib/db). 여기는 "화면을 여는 것"만 맡는다.
// 앱 코드와 따로 esbuild로 묶여 /serwist/sw.js로 나간다 (src/app/serwist/sw.js/route.ts)

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // 빌드가 채워 넣는 미리 받을 파일 목록 (.next/static의 JS·CSS 등)
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// 연결이 없고 저장해 둔 화면도 없을 때 보여 줄 화면
const OFFLINE_FALLBACK_PATH = '/~offline';

// 저장해 둔 화면은 30일까지 (기본 규칙은 24시간이라 하루만 오프라인이어도 화면이 사라졌다)
const PAGE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const PAGE_MAX_ENTRIES = 64;
// 이만큼 기다려도 서버가 답하지 않으면 저장해 둔 화면을 먼저 보여 준다 (신호가 약한 곳)
const PAGE_NETWORK_TIMEOUT_SECONDS = 5;

// 미리 받을 파일 목록으로 만든 이 서비스 워커의 버전. 화면 HTML은 그 빌드의 JS 파일 이름을 가리켜서,
// 새 배포가 오면 옛 HTML을 버려야 한다(옛 JS는 미리 받은 목록에서 빠진다) → 캐시 이름에 버전을 붙인다
function hashOf(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}
const PAGE_CACHE = `${PAGE_CACHE_PREFIX}-${hashOf(JSON.stringify(self.__SW_MANIFEST ?? []))}`;

// 화면 HTML 저장 규칙
const pagePlugins: SerwistPlugin[] = [
  // 로그인 화면으로 돌려보내진 응답(redirected)이나 오류는 저장하지 않는다:
  // 로그인 전에 받은 "/"가 로그인 화면으로 저장되면, 오프라인에서 홈 대신 로그인 화면이 뜬다
  {
    cacheWillUpdate: async ({ response }) =>
      response.status === 200 && !response.redirected ? response : null,
  },
  // 연결도 저장본도 없을 때:
  // 1) 기록의 상세·수정이면 미리 받아 둔 틀로. 틀의 HTML은 기록마다 같고, 어느 기록인지는 브라우저가 주소에서 읽는다
  // 2) 아니면(또는 틀도 없으면) 오프라인 대체 화면
  // 대체 화면도 여기서 직접 낸다: Serwist는 handlerDidError가 이미 있는 규칙에는 fallbacks(대체 화면)를 붙이지 않는다
  // (node_modules/serwist: plugins.some(p => "handlerDidError" in p)면 건너뜀)
  {
    handlerDidError: async ({ request }) => {
      const template = templatePathFor(new URL(request.url).pathname);
      const templateResponse = template
        ? await caches.match(template, {
            cacheName: PAGE_CACHE,
            ignoreSearch: true,
          })
        : undefined;
      return templateResponse ?? serwist.matchPrecache(OFFLINE_FALLBACK_PATH);
    },
  },
  new ExpirationPlugin({
    maxEntries: PAGE_MAX_ENTRIES,
    maxAgeSeconds: PAGE_MAX_AGE_SECONDS,
  }),
];

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
    // 오프라인 데이터는 IndexedDB 사본이 맡는다 (로그아웃 때 지우는 위치를 한 곳으로)
    {
      matcher: ({ sameOrigin }) => !sameOrigin,
      handler: new NetworkOnly(),
    },
    // 화면 HTML (화면 조각 RSC 요청은 아래 기본 규칙). 네트워크 먼저, 안 되면 저장본.
    // ignoreSearch: 화면 HTML은 주소의 ?뒤(검색어·달·타입)와 상관없이 같다 → ?type=review도 ?type=expense 때 저장한 화면으로 연다
    {
      matcher: ({ request, sameOrigin, url }) =>
        sameOrigin &&
        request.method === 'GET' &&
        request.headers.get('RSC') !== '1' &&
        isPagePath(url.pathname),
      handler: new NetworkFirst({
        cacheName: PAGE_CACHE,
        networkTimeoutSeconds: PAGE_NETWORK_TIMEOUT_SECONDS,
        matchOptions: { ignoreSearch: true },
        plugins: pagePlugins,
      }),
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

// 새 버전이 자리를 잡으면 옛 버전의 화면 캐시를 지운다 (옛 JS를 가리키는 HTML)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (name) =>
                name.startsWith(`${PAGE_CACHE_PREFIX}-`) && name !== PAGE_CACHE,
            )
            .map((name) => caches.delete(name)),
        ),
      ),
  );
});

serwist.addEventListeners();
