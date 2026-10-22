import { expect, test, type Page } from '@playwright/test';

// 25a 오프라인 이동 실험: 서비스 워커(src/sw/sw.ts)만 있고 기록 데이터는 아직 서버에서 받는 상태에서,
// 연결이 끊기면 무엇이 열리고 무엇이 깨지는지 확인한다.
// 단언하는 것: (1) 연 적 있는 화면은 오프라인 새로고침에도 화면 틀이 뜬다 (2) 연 적 없는 화면은 오프라인 대체 화면.
// 데이터가 어떻게 보이는지는 결과를 기록(annotation)만 하고 단언하지 않는다 → 25b(IndexedDB 사본)가 고칠 대상

// 서비스 워커가 이 페이지를 맡을 때까지 기다린다. 처음 방문에서는 등록만 되고, clientsClaim으로 곧 넘어온다
async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller !== null,
    undefined,
    { timeout: 15_000 },
  );
}

test('오프라인: 연 화면은 틀이 뜨고, 안 연 화면은 대체 화면', async ({
  page,
  context,
}) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '로그인 없이 체험하기' }).click();
  await expect(page).toHaveURL('/');
  await waitForServiceWorker(page);

  // 온라인에서 두 화면을 연다 (서비스 워커가 저장해 둔다)
  await page.goto('/');
  await expect(
    page.getByRole('region', { name: /월 \d+일/ }).getByText('가계부 2건'),
  ).toBeVisible();
  await page.goto('/records');
  await expect(
    page.getByText('[식비] 점심').filter({ visible: true }).first(),
  ).toBeVisible();

  await context.setOffline(true);

  // (1) 연 적 있는 화면: 새로고침해도 화면 틀(제목·검색창)은 뜬다
  const reload = await page.reload();
  test.info().annotations.push({
    type: '기록 탭 새로고침 응답',
    description: `서비스 워커 응답: ${reload?.fromServiceWorker() ?? '응답 없음'}`,
  });
  await expect(
    page.getByRole('heading', { name: '기록', level: 1 }).first(),
  ).toBeVisible();

  // 데이터는 서버에서 받으므로 어떻게 보이는지만 기록한다 (불러오는 중 / 오류 / 보임)
  await page.waitForTimeout(5_000);
  const dataState = (await page
    .getByText('[식비] 점심')
    .filter({ visible: true })
    .count())
    ? '기록이 보임'
    : (await page.getByRole('alert').filter({ visible: true }).count())
      ? '오류 안내'
      : '불러오는 중(회색 자리)';
  test.info().annotations.push({
    type: '오프라인 기록 탭 데이터',
    description: dataState,
  });

  // (2) 연 적 없는 화면: 오프라인 대체 화면
  await page.goto('/records/search');
  await expect(
    page.getByRole('heading', { name: '오프라인이에요' }),
  ).toBeVisible();

  await context.setOffline(false);
  // CI 로그에서 바로 읽을 수 있게 관찰 결과를 남긴다 (보고서를 열지 않아도 된다)
  for (const { type, description } of test.info().annotations) {
    console.log(`[오프라인 실험] ${type}: ${description}`);
  }
});
