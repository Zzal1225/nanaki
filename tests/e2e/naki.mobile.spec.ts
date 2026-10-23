import { expect, test, type Page, type Route } from '@playwright/test';
import { findMobileProblems } from './helpers/mobileChecks';

// 나키(AI) 흐름 (step3): 하단 탭 → 질문 → 조건 칩·계산 한 줄·기록 → 기록 탭(검색)으로 이어 보기.
// CI에는 AI 키가 없어서 /api/naki 응답만 page.route로 흉내 낸다 (AI가 돌려줬다고 가정한 조건).
// 그 뒤(조건으로 기기 사본 찾기, 칩, 합계, 검색 화면 이동)는 실제 빌드 그대로다.
// 서비스 워커를 끈다: 워커가 대신 보낸 요청은 page.route를 거치지 않는다 (failure-states.mobile.spec.ts 설명)
test.use({ serviceWorkers: 'block' });

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
    .getByRole('link', { name });
}

// 브라우저의 이번 달 (체험 예시 기록의 오늘 것: 점심 9,800원 식비)
async function thisMonthRange(page: Page) {
  return page.evaluate(() => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const lastDay = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    return { from: `${month}-01`, to: `${month}-${pad(lastDay)}` };
  });
}

test('나키: 질문 → 이해한 조건 칩 + 합계 + 기록 → 기록 탭에서 이 조건으로 보기', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '로그인 없이 체험하기' }).click();
  await expect(page).toHaveURL('/');

  const range = await thisMonthRange(page);
  let askedBody: unknown = null;
  await page.route('**/api/naki', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { remaining: 10, limit: 10 } });
      return;
    }
    askedBody = route.request().postDataJSON();
    await route.fulfill({
      json: {
        remaining: 9,
        state: {
          keyword: '',
          type: 'expense',
          sort: 'latest',
          period: { kind: 'custom', ...range },
          fields: { category: { kind: 'select', values: ['식비'] } },
        },
      },
    });
  });

  await bottomTab(page, '나키').click();
  await expect(page).toHaveURL('/naki');
  await expect(page.getByText('기록에 대해 물어보세요')).toBeVisible();
  await expect(page.getByText(/오늘 10\/10회/)).toBeVisible();
  // 입력창이 아래에 있어 + 버튼은 없다
  await expect(page.getByRole('button', { name: '새 기록 쓰기' })).toHaveCount(
    0,
  );
  await expectNoProblems(page, '나키 (처음)');

  await page.getByLabel('나키에게 물어보기').fill('이번 달 식비 얼마야?');
  await page.getByRole('button', { name: '보내기' }).click();

  const chips = page.getByRole('list', { name: '찾은 조건' });
  await expect(chips).toContainText('가계부');
  await expect(chips).toContainText('식비');
  await expect(page.getByText(/합계 -[\d,]+원 · \d+건/)).toBeVisible();
  await expect(page.getByText(/오늘 9\/10회/)).toBeVisible();
  // 서버로는 질문·오늘·켜진 타입만 간다 (기록 내용 없음)
  expect(Object.keys(askedBody as object).sort()).toEqual([
    'question',
    'today',
    'types',
  ]);
  await expectNoProblems(page, '나키 (답)');

  await page
    .getByRole('link', { name: /기록 탭에서 이 조건으로 보기/ })
    .click();
  await expect(page).toHaveURL(/\/records\/search\?.*type=expense/);
  await expect(
    page.getByRole('link', { name: /\[식비\] 점심/ }).filter({ visible: true }),
  ).toBeVisible();
});
