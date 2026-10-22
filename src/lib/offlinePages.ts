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
