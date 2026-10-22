import { expect, test, type Page, type Route } from '@playwright/test';

// 실패·경계 상태를 실제 빌드에서 확인한다 (31단계, 테스트 전략 C).
// 단위 테스트는 저장소 함수를 mock으로 바꿔 "실패하면 이렇게 보인다"를 확인하지만, mock은 내가 기대한 동작을 적은 것이라
// 실제 흐름(기기 사본·동기화·대기열)과 어긋나도 통과한다 (PR #74의 로그아웃이 그랬다).
// 여기서는 서버(Supabase REST) 응답만 Playwright route로 바꾸고, 앱은 그대로 돌린다.
// 이 파일을 처음 쓰며 찾은 것: 처음 방문에서 서버 조회가 실패하면 빈 사본을 읽어 "기록이 없어요"로 보였다 (syncForRead로 고침)

// 서비스 워커를 끈다: 서비스 워커가 페이지를 맡으면 Supabase 요청을 워커가 대신 보내고, 그 요청은 page.route를 거치지 않는다.
// 처음 쓴 판에서 첫 요청만 가짜 500을 받고, 재시도는 워커를 통해 진짜 서버(200)로 가서 오류 대신 기록이 그려졌다 (CI trace로 확인).
// 오프라인 화면(서비스 워커)은 offline-flow.spec.ts가 따로 맡는다
test.use({ serviceWorkers: 'block' });

// 기록 표 요청 (조회 GET, 저장 POST). 주소 뒤 ?select=… 는 붙기도 하고 안 붙기도 한다
const RECORDS_API = /\/rest\/v1\/records(\?|$)/;
const ROUTINES_API = /\/rest\/v1\/routines(\?|$)/;

// PostgREST 오류 모양. code가 있으면 앱은 "서버가 거절했다"로 본다 (recordOutbox isServerRejection)
function postgrestError(code: string) {
  return JSON.stringify({
    code,
    message: 'E2E 흉내',
    details: null,
    hint: null,
  });
}

function failGet(status: number) {
  return (route: Route) =>
    route.request().method() === 'GET'
      ? route.fulfill({
          status,
          contentType: 'application/json',
          body: postgrestError('XX000'),
        })
      : route.continue();
}

async function startAsGuest(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: '로그인 없이 체험하기' }).click();
  await expect(page).toHaveURL('/');
}

function daySummary(page: Page) {
  return page.getByRole('region', { name: /월 \d+일/ });
}

// 조회 실패는 TanStack Query가 세 번 더 시도한 뒤(약 7초) 오류로 보인다
const QUERY_ERROR_TIMEOUT_MS = 20_000;

test('처음 방문에서 기록 조회가 실패하면 "불러오지 못했어요" → 다시 시도로 회복', async ({
  page,
}) => {
  // 예시 기록 넣기(POST)는 통과시키고 조회(GET)만 실패시킨다
  await page.route(RECORDS_API, failGet(500));
  await startAsGuest(page);

  const summary = daySummary(page);
  await expect(summary.getByRole('alert')).toContainText(
    '기록을 불러오지 못했어요',
    { timeout: QUERY_ERROR_TIMEOUT_MS },
  );
  // 빈 사본을 "기록이 없어요"로 그리지 않는다
  await expect(summary.getByText('기록이 없어요')).toHaveCount(0);

  await page.unroute(RECORDS_API);
  await summary.getByRole('button', { name: '다시 시도' }).click();
  await expect(summary.getByText('가계부 2건')).toBeVisible();
});

test('저장을 서버가 거절하면 "저장하지 못했어요" → 다시 시도로 저장', async ({
  page,
}) => {
  await startAsGuest(page);
  await expect(daySummary(page).getByText('가계부 2건')).toBeVisible();

  // 이제부터 저장(POST)만 거절한다 (check 제약 위반 흉내)
  await page.route(RECORDS_API, (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: postgrestError('23514'),
        })
      : route.continue(),
  );

  await page.getByRole('button', { name: '새 기록 쓰기' }).click();
  await page.getByRole('menuitem', { name: '가계부 쓰기' }).click();
  await page.getByLabel('금액').fill('3000');
  await page
    .getByRole('radiogroup', { name: '분류' })
    .getByRole('radio', { name: '식비' })
    .click();
  await page.getByLabel('제목').fill('거절될 기록');
  await page.getByRole('button', { name: '저장' }).click();

  // 기기에는 먼저 저장된다(오프라인 우선): 홈에 바로 보이고, 보내기만 막혀 "저장 대기"로 남는다
  await expect(page).toHaveURL('/');
  const summary = daySummary(page);
  await expect(summary.getByText('가계부 3건')).toBeVisible();
  // 토스트 문구는 화면 읽기용 사본까지 두 벌이라 첫 번째
  await expect(page.getByText('저장하지 못했어요').first()).toBeVisible();
  await summary.getByRole('button', { name: /가계부 3건/ }).click();
  const rejected = summary.getByRole('link', { name: /거절될 기록/ });
  await expect(rejected.getByText('저장 대기')).toBeVisible();

  // 서버가 다시 받아 주면 토스트의 "다시 시도"로 보내진다
  await page.unroute(RECORDS_API);
  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(rejected.getByText('저장 대기')).toHaveCount(0, {
    timeout: 15_000,
  });
});

test('응답이 느리면 불러오는 중 자리를 보여 주고, 다 오면 그린다', async ({
  page,
}) => {
  // 조회를 4초씩 늦춘다 (처음 방문의 사본 동기화는 3초 기다림 상한을 넘겨도 끝까지 기다린다)
  const DELAY_MS = 4_000;
  await page.route(RECORDS_API, async (route) => {
    if (route.request().method() === 'GET') {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
    await route.continue();
  });
  await startAsGuest(page);

  const summary = daySummary(page);
  await expect(summary.locator('[aria-busy="true"]')).toBeVisible();
  await expect(summary.getByText('가계부 2건')).toBeVisible({
    timeout: 20_000,
  });
  await expect(summary.locator('[aria-busy="true"]')).toHaveCount(0);
});

test('기록이 하나도 없으면 홈·기록 탭에 빈 상태 안내', async ({ page }) => {
  // 서버가 빈 목록을 돌려주는 계정 (체험 계정은 예시 기록이 늘 있어서 조회 응답을 비운다)
  const empty = (route: Route) =>
    route.request().method() === 'GET'
      ? route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '[]',
        })
      : route.continue();
  await page.route(RECORDS_API, empty);
  await page.route(ROUTINES_API, empty);
  await startAsGuest(page);

  await expect(daySummary(page).getByText('기록이 없어요')).toBeVisible();
  await page
    .getByRole('navigation', { name: '주요 메뉴' })
    .getByRole('link', { name: '기록', exact: true })
    .click();
  await expect(page).toHaveURL('/records');
  await expect(
    page.getByText('기록이 없어요').filter({ visible: true }),
  ).toBeVisible();
});
