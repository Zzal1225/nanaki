import { expect, test, type Page } from '@playwright/test';
import { findMobileProblems } from './helpers/mobileChecks';

// 예산 흐름 (33b): 가계부 화면 요약 카드 → 예산 화면 → 전체·분류별 예산 정하기 → 카드에 반영.
// 화면 이동은 앱 안을 눌러서 한다 (로그인 화면 말고는 page.goto를 쓰지 않는다, record-flow.mobile.spec.ts 설명).
// 체험 예시 기록 중 오늘 것: 점심 9,800원(식비) + 택시 7,000원(교통). 다른 날 기록은 달이 바뀌는 날에 따라 이 달에 들어오거나 빠져서
// 금액을 정확히 맞추지 않고, 오늘 것만으로 성립하는 것(식비 1,000원 예산은 반드시 넘는다)만 확인한다

async function expectNoProblems(page: Page, screen: string) {
  const problems = await findMobileProblems(page);
  expect.soft(problems, screen).toEqual({
    smallInputs: [],
    horizontalOverflow: [],
    smallTouchTargets: [],
  });
}

function bottomTab(page: Page, name: string) {
  return page
    .getByRole('navigation', { name: '주요 메뉴' })
    .getByRole('link', { name, exact: true });
}

const FLOW_TIMEOUT_MS = 120_000;
test.setTimeout(FLOW_TIMEOUT_MS);

test('가계부 카드 → 예산 정하기 → 전체·분류별 예산 → 카드에 예산 줄', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '로그인 없이 체험하기' }).click();
  await expect(page).toHaveURL('/');

  await bottomTab(page, '기록').click();
  await expect(page).toHaveURL('/records');
  await page
    .locator('a[href^="/records/type/expense"]')
    .filter({ visible: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/records\/type\/expense/);

  // 체험 계정은 예산이 없다 → "예산 정하기"
  await page.getByRole('link', { name: '예산 정하기' }).click();
  await expect(page).toHaveURL(/\/budget\?month=\d{4}-\d{2}$/);
  await expect(page.getByRole('heading', { name: '예산' })).toBeVisible();
  // 예산 화면도 기록 탭에 속한다
  await expect(bottomTab(page, '기록')).toHaveAttribute('aria-current', 'page');
  await expectNoProblems(page, '예산 화면 (예산 없음)');

  // 전체 예산 (바텀시트). 숫자 자판 칸이고 쉼표가 붙는다
  await page.getByRole('button', { name: /전체 예산 정하기/ }).click();
  const totalSheet = page.getByRole('dialog', { name: /예산/ });
  await expect(totalSheet).toBeVisible();
  const totalInput = totalSheet.getByLabel('전체 예산');
  await expect(totalInput).toHaveAttribute('inputmode', 'numeric');
  await totalInput.fill('600000');
  await expect(totalInput).toHaveValue('600,000');
  await expectNoProblems(page, '전체 예산 시트');
  await totalSheet.getByRole('button', { name: '저장' }).click();
  await expect(totalSheet).toBeHidden();
  await expect(page.getByText('600,000원', { exact: true })).toBeVisible();

  // 분류별 예산: 식비 1,000원이면 오늘 점심(9,800원)만으로 넘는다 → 아이콘 + "초과" 글자
  await page.getByRole('button', { name: '분류별 예산 정하기' }).click();
  const categorySheet = page.getByRole('dialog', { name: '분류별 예산' });
  await categorySheet.getByLabel('식비').fill('1000');
  await expectNoProblems(page, '분류별 예산 시트');
  await categorySheet.getByRole('button', { name: '저장' }).click();
  await expect(categorySheet).toBeHidden();
  await expect(page.getByText(/^[\d,]+원 초과$/)).toBeVisible();
  await expectNoProblems(page, '예산 화면 (예산 있음)');

  // 뒤로 → 가계부 화면 카드에 예산 줄
  await page.getByRole('link', { name: '가계부 화면으로 돌아가기' }).click();
  await expect(page).toHaveURL(/\/records\/type\/expense\?month=/);
  await expect(
    page.getByRole('link', { name: /예산 600,000원/ }),
  ).toBeVisible();
});
