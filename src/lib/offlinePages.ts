// 오프라인에서 화면을 여는 규칙 (25c-2). 앱(OfflineWarmup)과 서비스 워커(src/sw/sw.ts)가 함께 쓴다.
// 서비스 워커는 따로 묶이고 타입 검사도 따로라(webworker), 이 파일은 아무것도 import하지 않는다

// 서비스 워커가 화면 HTML을 담는 캐시 이름의 앞부분. 뒤에 서비스 워커 버전을 붙여, 새 배포 때 옛 HTML(옛 JS 파일을 가리킴)을 버린다
export const PAGE_CACHE_PREFIX = 'app-pages';

// 연 적 없는 기록의 상세·수정 화면 대신 내줄 틀. 가장 작은 UUID라 실제 기록과 겹치지 않는다.
// 틀의 HTML은 기록마다 같다(기록 id는 브라우저가 주소에서 읽는다, features/records/routes)
export const RECORD_TEMPLATE_ID = '00000000-0000-0000-0000-000000000000';

const RECORD_PAGE = /^\/records\/(?!new$|search$|type$)[^/]+(\/edit)?$/;

// 이 주소 대신 쓸 틀의 주소. 틀이 없는 화면이면 null
export function templatePathFor(pathname: string): string | null {
  const match = RECORD_PAGE.exec(pathname);
  if (!match) return null;
  return `/records/${RECORD_TEMPLATE_ID}${match[1] ?? ''}`;
}

// 화면 HTML 요청인지 (같은 도메인 GET, 파일·API·로그인 콜백·화면 조각(RSC) 요청이 아님).
// 서비스 워커가 미리 받으라고 받은 요청(CACHE_URLS)은 mode가 navigate가 아니어서 모양으로 판단한다
export function isPagePath(pathname: string): boolean {
  if (pathname.startsWith('/_next/')) return false;
  if (pathname.startsWith('/api/')) return false;
  if (pathname.startsWith('/auth/')) return false;
  if (pathname.startsWith('/serwist/')) return false;
  // 마지막 조각에 점이 있으면 파일(robots.txt, manifest.webmanifest, 아이콘)
  return !/\/[^/]*\.[^/]*$/.test(pathname);
}
