// 앱을 열 때 보이는 로딩 화면(AppSplash)의 규칙 (2026-10-25 사용자 결정):
// - 앱을 새로 열 때마다(새로 고침 포함). 앱 안에서 화면을 옮길 때는 앱 틀이 그대로라 다시 나오지 않는다
// - 최소 1초 보여 주고, 그 뒤 데이터 요청이 모두 끝나면 사라진다
// - 8초가 넘으면 그냥 화면을 보여 준다. 오프라인이면 처음부터 보여 주지 않는다 (기다릴 서버 응답이 없다)
// - 로그인 버튼을 누른 뒤에는 로그인 화면의 마지막 모습(나나키)에서 등장 동작 없이 이어진다

export const SPLASH_MIN_MS = 1_000;
export const SPLASH_MAX_MS = 8_000;
// 요청이 0개가 된 뒤 이만큼 더 0이면 끝난 것으로 본다: 앞 요청이 끝나야 시작하는 요청(예: 기간 조회 → 전체 동기화)
// 사이의 잠깐의 0에서 사라지지 않게
export const SPLASH_SETTLE_MS = 150;
// 사라지는 페이드 시간 (loginScreen.css .app-splash transition과 같은 값)
export const SPLASH_LEAVE_MS = 250;

// 로그인 버튼을 누르면 남기는 표시. 구글 로그인은 구글 화면을 다녀와 페이지를 새로 여니 메모리로는 넘길 수 없어 sessionStorage에 둔다
// (같은 탭에서만 살고 탭을 닫으면 사라진다 = "방금 로그인했다"에 맞는 수명)
export const SPLASH_CONTINUE_KEY = 'nanaki:splash-continue';

// html에 붙는 표시. 로딩 화면은 서버 HTML에 들어 있어 자바스크립트가 뜨기 전에 보이는데,
// "이어지기"·"오프라인"은 브라우저만 알아서 첫 그리기 전에 <head>의 스크립트가 붙인다 (loginScreen.css가 읽는다)
export const SPLASH_CONTINUED_ATTR = 'data-splash-continued';
export const SPLASH_SKIP_ATTR = 'data-splash-skip';

// 테마 스크립트(THEME_INIT_SCRIPT)와 같은 이유로 문자열로 실행된다: React보다 먼저, 첫 그리기 전에.
// sessionStorage는 개인 정보 보호 모드 등에서 던질 수 있어 try로 감싼다 (실패하면 보통 등장 동작으로 보인다)
export const SPLASH_INIT_SCRIPT = `(function(){try{var d=document.documentElement;if(navigator.onLine===false)d.setAttribute(${JSON.stringify(SPLASH_SKIP_ATTR)},"");if(sessionStorage.getItem(${JSON.stringify(SPLASH_CONTINUE_KEY)}))d.setAttribute(${JSON.stringify(SPLASH_CONTINUED_ATTR)},"")}catch(e){}})()`;

export function markSplashContinue(): void {
  try {
    sessionStorage.setItem(SPLASH_CONTINUE_KEY, '1');
  } catch {
    // 못 남기면 로딩 화면이 처음부터 등장할 뿐이다
  }
}

export function hasSplashContinue(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_CONTINUE_KEY) !== null;
  } catch {
    return false;
  }
}

export function clearSplashContinue(): void {
  try {
    sessionStorage.removeItem(SPLASH_CONTINUE_KEY);
  } catch {
    // 남아도 다음에 앱을 열 때 등장 동작 없이 보일 뿐이다
  }
  document.documentElement.removeAttribute(SPLASH_CONTINUED_ATTR);
}

// 최소·최대 시간까지 남은 시간. shownAt = 로딩 화면이 보이기 시작한 때(performance.now() 기준):
// 새로 연 페이지는 서버 HTML로 첫 그리기부터 보였으니 0(페이지 시작)이고, 하이드레이션까지 걸린 시간이 빠진다.
// 앱 안 이동(체험하기 뒤 홈)은 그 화면을 처음 그린 때다
export function remainingMinMs(now: number, shownAt: number): number {
  return Math.max(0, SPLASH_MIN_MS - (now - shownAt));
}

export function remainingMaxMs(now: number, shownAt: number): number {
  return Math.max(0, SPLASH_MAX_MS - (now - shownAt));
}
