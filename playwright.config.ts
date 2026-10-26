import { defineConfig, devices } from '@playwright/test';

const IS_CI = Boolean(process.env.CI);
// 사파리 엔진(WebKit)으로도 돌릴 때만 켠다 (CI의 별도 단계, 32단계). 평소 실행에는 WebKit 브라우저가 없어도 된다
const IS_WEBKIT = process.env.E2E_WEBKIT === '1';
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// 화면 비교 크기 (CLAUDE.md 기술 스택: 375/768/1024/1280/1440 + 1280×700). 높이는 그 폭의 흔한 화면 높이
const VISUAL_VIEWPORTS = [
  { name: 'w375', width: 375, height: 812 },
  { name: 'w768', width: 768, height: 1024 },
  { name: 'w1024', width: 1024, height: 768 },
  { name: 'w1280', width: 1280, height: 800 },
  { name: 'w1440', width: 1440, height: 900 },
  { name: 'w1280h700', width: 1280, height: 700 },
] as const;

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
  // 기준 이미지가 없으면 새로 써 둔다 (이미 있는 것은 덮어쓰지 않는다). 주의: Playwright는 이때 테스트를 통과시킨다.
  // 그래서 CI는 E2E 뒤에 "새로 써진 기준 이미지가 있으면 실패" 단계를 두고 그 이미지를 아티팩트로 올린다 (ci.yml).
  // 사람이 내려받아 확인한 뒤 커밋해야 기준이 된다
  updateSnapshots: 'missing',
  use: {
    baseURL: BASE_URL,
    // 실패했을 때만 기록(화면·네트워크·DOM 시간순)을 남겨 원인을 볼 수 있게
    trace: 'retain-on-failure',
    // 사용자 환경과 같게: 한국어, 한국 시간. "오늘"과 날짜 표시가 이 시간대 기준이 된다
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },
  // 화면 비교 기준 이미지와 비교할 때 허용하는 차이: 전체 픽셀의 0.2%.
  // 0이면 글꼴 안티앨리어싱 한두 픽셀에도 실패하고, 크게 잡으면 버튼 하나가 사라져도 통과한다
  expect: { toHaveScreenshot: { maxDiffPixels: 0 } },
  projects: [
    // 기능 흐름: PC(1280×720). 기록 쓰기(사이드바 "새 기록" 메뉴)와 검색(기록 탭 왼쪽 목록 자리)
    {
      name: 'desktop-chrome',
      testMatch: /-flow\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    // 기능 흐름: 아이폰 크기·터치 (*.mobile.spec.ts). 실기기에서 찾은 문제의 절반은 크롬 흉내로도 재현됐다 (2026-10-22 분석):
    // 하단 탭·스피드 다이얼·바텀시트를 실제로 누르는 흐름과, 아이폰 단골 함정(입력칸 16px, 가로 넘침, 터치 44px) 검사.
    // 브라우저는 아직 크로미움: 아이폰 프리셋의 기본은 WebKit인데, WebKit은 흔들림을 먼저 본 뒤 따로 더한다 (다음 단계 B)
    {
      name: 'mobile',
      testMatch: /\.mobile\.spec\.ts$/,
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
    // 화면 비교는 다시 시도하지 않는다: 시계·데이터를 고정해 늘 같아야 하는 화면이라, 재시도는 흔들림을 숨기기만 한다.
    // 화면 비교: CLAUDE.md의 크기들. 모바일 375 / 태블릿 768 / PC 경계 1024 / 1280 / 1440 / 낮은 노트북 1280×700 / 터치 기기
    ...VISUAL_VIEWPORTS.map(({ name, width, height }) => ({
      name,
      testMatch: 'visual.spec.ts',
      retries: 0,
      use: { ...devices['Desktop Chrome'], viewport: { width, height } },
    })),
    {
      name: 'touch',
      testMatch: 'visual.spec.ts',
      retries: 0,
      // 터치·모바일 브라우저 동작(hasTouch, isMobile)을 켠 기기 프리셋. 크로미움이라 브라우저를 더 깔지 않는다.
      // 화면 배율은 1로: 기기 기본값(2.625)이면 이미지가 일곱 배 커지는데 비교에서 더 알 수 있는 건 없다
      use: { ...devices['Pixel 7'], deviceScaleFactor: 1 },
    },
    // 같은 모바일 흐름을 사파리 엔진(WebKit)으로 (아이폰 13 프리셋의 기본 브라우저가 WebKit이다).
    // 리눅스 WebKit은 iOS 사파리 그 자체는 아니지만 JS·CSS 엔진 차이(날짜 해석, 지원하지 않는 CSS·API)를 잡는다.
    // 홈 화면 앱·안전 영역·실제 키보드는 여전히 실기기 체크리스트(docs/real-device-checklist.md)가 맡는다.
    // 처음에는 CI에서 실패해도 경고만 한다: 흔들림이 없는지 본 뒤 실패로 바꾼다 (Lighthouse 성능 점수와 같은 방식)
    ...(IS_WEBKIT
      ? [
          {
            name: 'mobile-webkit',
            testMatch: /.mobile.spec.ts$/,
            use: { ...devices['iPhone 13'] },
          },
        ]
      : []),
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
