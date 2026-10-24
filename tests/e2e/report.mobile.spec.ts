import { expect, test, type Page } from '@playwright/test';
import { findMobileProblems } from './helpers/mobileChecks';

// 보고서 흐름 (step4 40): 기록 탭 검색창 옆 보고서 → 기간·타입 고르기 → 결과 → 인쇄 모양.
// 화면 이동은 앱 안을 눌러서 한다 (record-flow.mobile.spec.ts 설명). 체험 예시 기록은 오늘 기준 최근 2주라
// 이번 달 금액·건수는 날짜에 따라 달라져서 맞추지 않고, 오늘 것(점심·택시)이 있는 가계부 카드가 나오는지만 본다.
// 인쇄는 emulateMedia로 본다: 진짜 인쇄 창은 자동화할 수 없고, 앱 틀(하단 탭)이 사라지는지가 이 화면의 약속이다
// (2026-10-24: @media print 묶음이 빌드에서 통째로 버려져도 화면은 멀쩡해 보여서, 인쇄 모양을 따로 확인한다)

async function expectNoProblems(page: Page, screen: string) {
  const problems = await findMobileProblems(page);
  expect.soft(problems, screen).toEqual({
    smallInputs: [],
    horizontalOverflow: [],
    smallTouchTargets: [],
  });
}

function bottomTabs(page: Page) {
  return page.getByRole('navigation', { name: '주요 메뉴' });
}

const FLOW_TIMEOUT_MS = 120_000;
test.setTimeout(FLOW_TIMEOUT_MS);

test('기록 탭 보고서 → 이번 달 만들기 → 타입 카드 → 인쇄 모양', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '로그인 없이 체험하기' }).click();
  await expect(page).toHaveURL('/');

  await bottomTabs(page)
    .getByRole('link', { name: '기록', exact: true })
    .click();
  await expect(page).toHaveURL('/records');
  await page.getByRole('link', { name: '보고서' }).click();
  await expect(page).toHaveURL('/report');
  await expect(
    page.getByRole('heading', { level: 1, name: '보고서', exact: true }),
  ).toBeVisible();
  // 이번 달이 기본, 켜 둔 타입은 모두 체크된 채
  await expect(page.getByRole('button', { name: '이번 달' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('checkbox', { name: /가계부/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expectNoProblems(page, '보고서 고르기');

  await page.getByRole('button', { name: '보고서 만들기' }).click();
  await expect(page).toHaveURL(/\/report\?from=\d{4}-\d{2}-01&to=/);
  await expect(
    page.getByRole('heading', { level: 1, name: /^\d{4}년 \d+월 보고서$/ }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: '가계부' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'PDF로 저장' })).toBeVisible();
  await expectNoProblems(page, '보고서 결과');

  await page.emulateMedia({ media: 'print' });
  await expect(bottomTabs(page)).toBeHidden();
  await expect(page.getByRole('button', { name: 'PDF로 저장' })).toBeHidden();
  await expect(page.getByText('나는 나를 키운다 · nanaki')).toBeVisible();
});
