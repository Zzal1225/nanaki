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
  // name은 부분 일치라 "10월 예산"·"분류별 예산" 제목도 잡힌다 → 화면 제목(h1)만 정확히
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: '예산',
      exact: true,
    }),
  ).toBeVisible();
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

test('가계부 쓰기의 고정지출 체크 → 가계부 화면 → 고정지출 화면에서 수정·해지', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '로그인 없이 체험하기' }).click();
  await expect(page).toHaveURL('/');

  // 가계부 쓰기: 금액 칸 옆 "고정지출"을 체크하고 저장
  await page.getByRole('button', { name: '새 기록 쓰기' }).click();
  await page.getByRole('menuitem', { name: '가계부 쓰기' }).click();
  await page.getByLabel('금액').fill('700000');
  const fixedToggle = page.getByRole('checkbox', { name: '고정지출' });
  await fixedToggle.click();
  await expect(fixedToggle).toBeChecked();
  await page
    .getByRole('radiogroup', { name: '분류' })
    .getByRole('radio', { name: '생활' })
    .click();
  await page.getByLabel('제목').fill('월세');
  await page.getByLabel('제목').blur();
  await expectNoProblems(page, '가계부 쓰기 (고정지출 체크)');
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page).toHaveURL('/');
  await expect(
    page.getByText(/매달 \d+일에 자동으로 기록돼요/).first(),
  ).toBeVisible();

  // 가계부 화면 요약 카드: 체험 예시 2개 + 방금 만든 1개
  await bottomTab(page, '기록').click();
  await page
    .locator('a[href^="/records/type/expense"]')
    .filter({ visible: true })
    .first()
    .click();
  await page.getByRole('link', { name: /고정지출 3개/ }).click();
  await expect(page).toHaveURL('/fixed-expenses');
  await expect(
    page.getByRole('heading', { level: 1, name: '고정지출', exact: true }),
  ).toBeVisible();
  await expect(bottomTab(page, '기록')).toHaveAttribute('aria-current', 'page');

  // 이번 달 몫은 방금 쓴 기록이라 "기록됨"
  const list = page.getByRole('region', { name: '고정지출 목록' });
  const rent = list.getByRole('button', { name: /월세/ });
  await expect(rent).toContainText('기록됨');
  await expect(rent).toContainText('-700,000원');
  await expectNoProblems(page, '고정지출 화면');

  // 수정: 줄을 누르면 시트
  await rent.click();
  const edit = page.getByRole('dialog', { name: '고정지출 수정' });
  await edit.getByLabel('금액').fill('650000');
  await expectNoProblems(page, '고정지출 수정 시트');
  await edit.getByRole('button', { name: '저장' }).click();
  await expect(edit).toBeHidden();
  await expect(rent).toContainText('-650,000원');

  // 해지: 확인 창 뒤 목록에서 빠진다
  await rent.click();
  await page
    .getByRole('dialog', { name: '고정지출 수정' })
    .getByRole('button', { name: '해지' })
    .click();
  const confirm = page.getByRole('alertdialog', { name: '월세를 해지할까요?' });
  await confirm.getByRole('button', { name: '해지' }).click();
  await expect(list.getByRole('button', { name: /월세/ })).toHaveCount(0);
});
