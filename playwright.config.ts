import { defineConfig, devices } from '@playwright/test';

const IS_CI = Boolean(process.env.CI);
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// 실제 브라우저로 사용자 흐름을 따라가는 E2E 테스트 설정.
// 앱은 테스트용 로컬 Supabase(CI의 supabase start)에 붙은 채로 빌드·실행한다 (ci.yml integration 작업).
// 실제 서비스 DB에는 절대 붙이지 않는다: 테스트가 체험 계정과 기록을 만든다
export default defineConfig({
  testDir: 'tests/e2e',
  // 같은 DB를 쓰는 테스트가 서로 영향을 주지 않게 한 번에 하나씩
  fullyParallel: false,
  workers: 1,
  // CI에 test.only가 남아 있으면 나머지를 건너뛰고 초록불이 되므로 실패시킨다
  forbidOnly: IS_CI,
  // 네트워크·첫 빌드 지연으로 가끔 흔들리는 실패를 한 번만 다시 시도한다. 두 번 다 실패하면 진짜 실패
  retries: IS_CI ? 1 : 0,
  reporter: IS_CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    // 실패했을 때만 기록(화면·네트워크·DOM 시간순)을 남겨 원인을 볼 수 있게
    trace: 'retain-on-failure',
    // 사용자 환경과 같게: 한국어, 한국 시간. "오늘"과 날짜 표시가 이 시간대 기준이 된다
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },
  projects: [
    // PC(1280×720): 사이드바의 "새 기록" 메뉴로 쓴다. 모바일 흐름(스피드 다이얼)은 화면 비교(17c)에서 모양을 본다
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
  ],
  // 개발 서버가 아니라 빌드한 앱으로 돌린다: 배포와 같은 결과물(cacheComponents 미리 그리기 포함)을 확인하려고.
  // CI는 앞 단계에서 npm run build를 끝내 두고 여기서는 실행만 한다
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: `${BASE_URL}/login`,
    reuseExistingServer: !IS_CI,
    timeout: 120_000,
  },
});
