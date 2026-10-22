// 오프라인에서 화면을 여는 규칙 (25c-2). 서비스 워커(src/sw/sw.ts)가 쓴다.
// 서비스 워커는 따로 묶이고 타입 검사도 따로라(webworker), 이 파일은 아무것도 import하지 않는다

// 서비스 워커가 화면 HTML을 담는 캐시 이름의 앞부분. 뒤에 서비스 워커 버전을 붙여, 새 배포 때 옛 HTML(옛 JS 파일을 가리킴)을 버린다
export const PAGE_CACHE_PREFIX = 'app-pages';

// 화면 HTML 요청인지 (같은 도메인 GET, 파일·API·로그인 콜백·서비스 워커 파일이 아님).
// 미리 받기(OfflineWarmup)의 fetch는 mode가 navigate가 아니어서 요청 종류가 아니라 주소 모양으로 판단한다
export function isPagePath(pathname: string): boolean {
  if (pathname.startsWith('/_next/')) return false;
  if (pathname.startsWith('/api/')) return false;
  if (pathname.startsWith('/auth/')) return false;
  if (pathname.startsWith('/serwist/')) return false;
  // 마지막 조각에 점이 있으면 파일(robots.txt, manifest.webmanifest, 아이콘)
  return !/\/[^/]*\.[^/]*$/.test(pathname);
}

// 페이지 → 서비스 워커: "이 화면들을 받아 둬" (OfflineWarmup이 보낸다)
export const WARM_PAGES_MESSAGE = 'nanaki:warm-pages';

export type WarmPagesMessage = {
  type: typeof WARM_PAGES_MESSAGE;
  paths: string[];
};

// 메시지가 우리 모양인지. 서비스 워커는 같은 도메인 페이지의 메시지만 받지만, 모양은 믿지 않고 확인한다
export function isWarmPagesMessage(data: unknown): data is WarmPagesMessage {
  if (typeof data !== 'object' || data === null) return false;
  const message = data as Partial<WarmPagesMessage>;
  return (
    message.type === WARM_PAGES_MESSAGE &&
    Array.isArray(message.paths) &&
    message.paths.every((path) => typeof path === 'string')
  );
}

type WarmPageCacheOptions = {
  // 지금 버전 서비스 워커의 화면 캐시 하나. caches.match(모든 캐시)를 쓰지 않는 게 핵심이다:
  // 새 버전이 오는 중에는 옛 버전 캐시가 아직 남아 있어 "이미 있다"고 건너뛰고, 곧 옛 캐시가 지워져
  // 받아 둔 화면이 하나도 없게 됐다 (2026-10-22 아이폰 확인: 배포 직후 오프라인 작성이 대체 화면)
  cache: Cache;
  paths: readonly string[];
  fetchPage: (path: string) => Promise<Response>;
};

// 아직 없는 화면만 하나씩 받아 둔다 (한꺼번에 보내면 화면을 쓰는 동안 요청이 몰린다).
// 저장 규칙은 화면 캐시와 같다: 200이고 다른 곳(로그인 화면)으로 돌려보내지지 않은 응답만.
// 실패는 넘어간다: 다음 기회(앱 열기·새 버전·연결 복구)에 다시 받는다
export async function warmPageCache({
  cache,
  paths,
  fetchPage,
}: WarmPageCacheOptions): Promise<void> {
  for (const path of paths) {
    if (!isPagePath(path)) continue;
    if (await cache.match(path)) continue;
    try {
      const response = await fetchPage(path);
      if (response.status === 200 && !response.redirected) {
        await cache.put(path, response);
      }
    } catch {
      // 연결 끊김 등
    }
  }
}
