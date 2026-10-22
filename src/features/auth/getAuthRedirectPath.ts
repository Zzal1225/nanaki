export const HOME_PATH = '/';
export const LOGIN_PATH = '/login';

// 로그인 없이 열 수 있는 주소
// - /auth/callback: 구글에서 돌아오는 순간에는 아직 세션이 없다
// - /design-system: README에서 면접관이 로그인 없이 보도록 링크한다
// - /robots.txt: 검색 로봇이 읽는 파일. 로그인 화면(HTML)으로 보내면 로봇이 규칙을 못 읽는다 (Lighthouse SEO에서 발견)
// - /manifest.webmanifest, /~offline: 서비스 워커·설치는 로그인 화면에서도 시작된다. 로그인 전에 받으면
//   로그인 화면 HTML이 대신 저장돼, 오프라인 대체 화면 자리에 로그인 화면이 뜬다
const PUBLIC_PATHS = [
  LOGIN_PATH,
  '/auth/callback',
  '/design-system',
  '/robots.txt',
  '/manifest.webmanifest',
  '/~offline',
];
const API_PATH_PREFIX = '/api/';
// 서비스 워커 파일(/serwist/sw.js). 로그인 화면에서도 등록되므로 로그인 전에 받을 수 있어야 한다
const SERVICE_WORKER_PATH_PREFIX = '/serwist/';

// 쿠키·요청과 떼어 낸 순수 함수라서 모든 경우를 단위 테스트로 확인할 수 있다.
// 보낼 주소를 돌려주고, 그대로 통과면 null
export function getAuthRedirectPath(
  pathname: string,
  isSignedIn: boolean,
): string | null {
  // API(Route Handler)는 화면 이동 대상이 아니다. fetch에 로그인 화면(HTML)을 돌려주면 성공처럼 보일 수 있어서,
  // 보내지 않고 각 API가 스스로 로그인을 확인해 401을 준다 (예: app/api/account)
  if (
    pathname.startsWith(API_PATH_PREFIX) ||
    pathname.startsWith(SERVICE_WORKER_PATH_PREFIX)
  ) {
    return null;
  }

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  // 공개 목록에 없는 주소는 모두 보호된다. 새 화면을 만들어도 따로 등록할 필요가 없다
  if (!isPublicPath && !isSignedIn) {
    return LOGIN_PATH;
  }

  // 이미 로그인한 사람에게 로그인 화면을 다시 보여 주지 않는다
  if (isSignedIn && pathname === LOGIN_PATH) {
    return HOME_PATH;
  }

  return null;
}
