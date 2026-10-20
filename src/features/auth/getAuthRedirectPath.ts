export const HOME_PATH = '/';
export const LOGIN_PATH = '/login';

// 로그인 없이 열 수 있는 주소
// - /auth/callback: 구글에서 돌아오는 순간에는 아직 세션이 없다
// - /design-system: README에서 면접관이 로그인 없이 보도록 링크한다
const PUBLIC_PATHS = [LOGIN_PATH, '/auth/callback', '/design-system'];

// 쿠키·요청과 떼어 낸 순수 함수라서 모든 경우를 단위 테스트로 확인할 수 있다.
// 보낼 주소를 돌려주고, 그대로 통과면 null
export function getAuthRedirectPath(
  pathname: string,
  isSignedIn: boolean,
): string | null {
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
