import { expect, test, type Page } from '@playwright/test';
import { findMobileProblems } from './helpers/mobileChecks';

// 나키(AI) 흐름 (step3): 체험하기 → 나키 탭 → 예시 질문 누르기 → 이해한 조건 칩 + 결과 목록 → 기록 탭(검색)으로 이어 보기.
// AI는 서버의 어댑터가 고정 응답을 돌려준다 (CI의 NAKI_FAKE_MODEL=1, nakiModel.ts: 질문과 상관없이 "가계부 전체").
// 그 밖(로그인 확인, 하루 횟수 세기, 조건 거르기, 기기 사본 찾기, 칩, 검색 화면 이동)은 실제 빌드 그대로다

async function expectNoProblems(page: Page, screen: string) {
  const problems = await findMobileProblems(page);
  expect.soft(problems, screen).toEqual({
    smallInputs: [],
    horizontalOverflow: [],
    smallTouchTargets: [],
  });
}

// 탭 링크 이름은 뱃지까지 "나키 AI"로 읽혀서 정확히 일치가 아니라 포함으로 찾는다
function bottomTab(page: Page, name: string) {
  return page
    .getByRole('navigation', { name: '주요 메뉴' })
    .getByRole('link', { name });
}

test('나키: 예시 질문 → 이렇게 이해했어요 칩 + 결과 목록 → 기록 탭에서 이 조건으로 보기', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '로그인 없이 체험하기' }).click();
  await expect(page).toHaveURL('/');

  await bottomTab(page, '나키').click();
  await expect(page).toHaveURL('/naki');
  await expect(page.getByText('기록에 대해 물어보세요')).toBeVisible();
  // 체험 계정은 하루 3회 (서버 환경 변수 기본값)
  await expect(page.getByText(/오늘 3\/3회/)).toBeVisible();
  // 입력창이 아래에 있어 + 버튼은 없다
  await expect(page.getByRole('button', { name: '새 기록 쓰기' })).toHaveCount(
    0,
  );

  // 예시 질문은 타이핑하듯 나타난다. 나타나면 눌러 바로 보낸다
  const example = page.getByRole('button', {
    name: '지난달 외식비 얼마였어?',
  });
  await expect(example).toBeVisible();
  await expectNoProblems(page, '나키 (처음)');
  await example.click();

  const chips = page.getByRole('list', { name: '찾은 조건' });
  await expect(page.getByText('이렇게 이해했어요')).toBeVisible();
  await expect(chips).toContainText('가계부');
  // 답은 이름줄 + 큰 값 두 줄 (2026-10-24 #111: 답을 더 뚜렷하게)
  await expect(page.getByText(/^합계 · \d+건$/)).toBeVisible();
  await expect(page.getByText(/^-[\d,]+원$/).first()).toBeVisible();
  // 결과 목록: 체험 예시 기록 중 오늘 것 (점심 9,800원)
  await expect(page.getByRole('link', { name: /\[식비\] 점심/ })).toBeVisible();
  // 하루 횟수를 서버가 실제로 셌다
  await expect(page.getByText(/오늘 2\/3회/)).toBeVisible();
  await expectNoProblems(page, '나키 (답)');

  await page
    .getByRole('link', { name: /기록 탭에서 이 조건으로 보기/ })
    .click();
  await expect(page).toHaveURL(/\/records\/search\?.*type=expense/);
  await expect(
    page.getByRole('link', { name: /\[식비\] 점심/ }).filter({ visible: true }),
  ).toBeVisible();
});
