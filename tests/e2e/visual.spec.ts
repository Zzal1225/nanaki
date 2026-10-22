import { expect, test, type Page } from '@playwright/test';

// 화면 비교: 핵심 4화면(로그인·홈·기록 탭·설정)을 크기마다 찍어 기준 이미지와 비교한다.
// 반응형 레이아웃(하단 탭 ↔ 사이드바, 좌우 배치)이 어떤 폭에서 깨졌는지 사람이 일일이 보지 않아도 알 수 있게.
// 크기는 playwright.config.ts의 화면 비교 프로젝트들, 다크모드는 모바일·PC 대표 폭에서만 (기준 이미지 수를 줄이려고)
const DARK_MODE_PROJECTS = ['w375', 'w1280'];

// 날짜를 고정한다: 예시 기록 날짜("오늘에서 며칠 전")와 캘린더의 오늘이 매번 같아야 같은 화면이 나온다.
// 브라우저 안의 Date만 바뀐다 (서버·Supabase 토큰 검사는 진짜 시각)
const FIXED_NOW = new Date('2026-10-21T12:00:00+09:00');

// 글꼴(Pretendard)이 다 내려받아지기 전에 찍으면 기본 글꼴로 찍혀 매번 달라진다
async function waitForFonts(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

async function capture(page: Page, name: string) {
  await waitForFonts(page);
  // fullPage: 모바일에서 아래로 스크롤해야 보이는 부분까지.
  // soft: 한 화면이 달라도 멈추지 않고 나머지 화면까지 찍어 비교한다. 첫 장에서 멈추면
  // 어느 화면들이 깨졌는지 한 번에 알 수 없고, 새 기준 이미지도 한 장씩만 생긴다
  await expect.soft(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
}

// 로그인한 뒤의 세 화면. 각 화면은 데이터가 다 그려진 뒤에 찍는다 (불러오는 중의 회색 자리를 찍지 않게)
async function captureSignedInScreens(page: Page, theme: 'light' | 'dark') {
  await page.goto('/');
  await expect(
    page.getByRole('region', { name: /월 \d+일/ }).getByText('가계부 2건'),
  ).toBeVisible();
  await capture(page, `home-${theme}`);

  await page.goto('/records');
  // 같은 목록이 PC용(왼쪽 패널)과 모바일용 두 벌 DOM에 있고, 폭에 따라 한쪽은 CSS로 숨는다.
  // first()만 쓰면 숨은 쪽을 집어 영영 기다리므로 보이는 것 중에서 고른다
  await expect(
    page.getByText('[식비] 점심').filter({ visible: true }).first(),
  ).toBeVisible();
  await capture(page, `records-${theme}`);

  await page.goto('/settings');
  await expect(page.getByRole('switch', { name: '가계부' })).toBeVisible();
  await expect(page.getByText('체험 계정')).toBeVisible();
  await capture(page, `settings-${theme}`);
}

// 크기마다 체험 계정을 하나만 만든다: 로컬 Supabase의 익명 로그인 한도(시간당 30)를 넘지 않게
test('핵심 4화면', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(FIXED_NOW);
  const hasDarkMode = DARK_MODE_PROJECTS.includes(testInfo.project.name);

  // 로그인 화면은 로그인하기 전에만 볼 수 있다 (로그인하면 홈으로 보낸다)
  await page.goto('/login');
  await expect(
    page.getByRole('button', { name: '로그인 없이 체험하기' }),
  ).toBeVisible();
  await capture(page, 'login-light');
  if (hasDarkMode) {
    await page.emulateMedia({ colorScheme: 'dark' });
    await capture(page, 'login-dark');
    await page.emulateMedia({ colorScheme: 'light' });
  }

  await page.getByRole('button', { name: '로그인 없이 체험하기' }).click();
  await expect(page).toHaveURL('/');

  await captureSignedInScreens(page, 'light');
  if (hasDarkMode) {
    // 테마 기본값이 "시스템"이라 브라우저의 다크 설정을 따라간다
    await page.emulateMedia({ colorScheme: 'dark' });
    await captureSignedInScreens(page, 'dark');
  }
});
