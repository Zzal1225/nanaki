import { expect, test, type Page } from '@playwright/test';

// 오프라인 (25a 화면 틀 → 25b 기기 사본 → 25c 오프라인 작성 → 25c-2 연 적 없는 화면).
// - 기록은 기기 사본(IndexedDB)에서 읽어서 연결이 끊겨도 보인다
// - 로그인 뒤 주요 화면을 미리 받아 두어(OfflineWarmup), 연 적 없는 타입 상세·기록 상세·수정·작성도 열린다
//   기록 상세·수정은 id가 ?id=라 기록마다 HTML이 같아서 한 장으로 모든 기록을 연다 (features/records/routes)
// - 미리 받지 않는 화면은 오프라인 대체 화면

// 서비스 워커가 이 페이지를 맡을 때까지 기다린다. 처음 방문에서는 등록만 되고, clientsClaim으로 곧 넘어온다
async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller !== null,
    undefined,
    { timeout: 15_000 },
  );
}

// 미리 받기(OfflineWarmup)가 끝날 때까지: 목록 끝의 타입 화면과 수정 화면이 캐시에 들어왔는지 본다.
// - 주소 그대로 찾는다: ?를 무시하면 Next가 미리 받은 화면 조각(?_rsc=)까지 맞아서 미리 받기 전에 통과해 버린다
// - expect.poll로 기다린다: waitForFunction에 async 함수를 주면 돌려받은 Promise 자체를 "참"으로 보고 바로 넘어간다
//   (25c-2에서 미리 받기 전에 오프라인으로 바꿔 실패했다)
async function waitForWarmup(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const edit = '/records/edit';
          return Boolean(
            (await caches.match(edit)) &&
            (await caches.match('/records/type/body')),
          );
        }),
      { timeout: 30_000, intervals: [500] },
    )
    .toBe(true);
}

// PC 기록 탭은 같은 목록이 두 벌(왼쪽 패널 + 숨은 본문) 있다. 보이는 쪽만 본다
function visibleText(page: Page, text: string | RegExp) {
  return page.getByText(text).filter({ visible: true }).first();
}

async function startAsGuest(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: '로그인 없이 체험하기' }).click();
  await expect(page).toHaveURL('/');
  await waitForServiceWorker(page);
  await waitForWarmup(page);
}

test('오프라인: 연 적 없는 화면도 열리고, 기록은 기기 사본으로 그려지고, 검색도 사본에서 찾는다', async ({
  page,
  context,
}) => {
  await startAsGuest(page);
  // 기록 탭만 온라인에서 한 번 열어 사본을 채운다 (상세·수정·타입·검색은 한 번도 열지 않는다)
  await page.goto('/records');
  await expect(visibleText(page, '[식비] 점심')).toBeVisible();

  await context.setOffline(true);

  // (1) 연 적 있는 화면을 새로 고쳐도 기록이 보인다
  await page.goto('/records');
  await expect(visibleText(page, '[식비] 점심')).toBeVisible();

  // (2) 연 적 없는 기록 상세: 미리 받은 한 장(/records/view)으로 열고, 어느 기록인지는 주소(?id=)에서 읽는다
  await visibleText(page, '[식비] 점심').click();
  await expect(page).toHaveURL(/\/records\/view\?id=[0-9a-f-]{36}$/);
  await expect(
    page.getByRole('heading', { name: '점심', level: 1 }),
  ).toBeVisible();
  const recordId = new URL(page.url()).searchParams.get('id');

  // (3) 연 적 없는 수정 화면: 그 기록의 값이 폼에 들어 있다
  await page.goto(`/records/edit?id=${recordId}`);
  await expect(page.getByLabel('제목')).toHaveValue('점심');

  // (4) 연 적 없는 타입 상세
  await page.goto('/records/type/workout');
  await expect(
    page.getByRole('heading', { name: '운동', level: 1 }),
  ).toBeVisible();

  // (5) 검색: 주소만 바꾸고(서버에 묻지 않음) 사본에서 찾는다. 메모("원두")로 찾기
  await page.goto('/records/search');
  const searchBox = page
    .getByRole('searchbox', { name: '검색어' })
    .filter({ visible: true });
  await searchBox.fill('원두');
  await searchBox.press('Enter');
  await expect(visibleText(page, /동네 로스터리/)).toBeVisible();

  // (6) 미리 받지 않는 화면(루틴 만들기, 온라인 전용)은 대체 화면
  await page.goto('/routines/new');
  await expect(
    page.getByRole('heading', { name: '오프라인이에요' }),
  ).toBeVisible();

  await context.setOffline(false);
});

// 오프라인 작성: 저장은 기기 사본과 대기열에 하고(구름 아이콘), 연결이 돌아오면 저절로 보낸다
test('오프라인 작성: 연 적 없는 작성 화면에서 저장하면 바로 목록에 보이고, 연결되면 보내져 구름이 사라진다', async ({
  page,
  context,
}) => {
  await startAsGuest(page);
  await page.goto('/records');
  await expect(visibleText(page, '[식비] 점심')).toBeVisible();

  await context.setOffline(true);
  // 작성 화면은 한 번도 연 적이 없다 (미리 받아 둔 한 장이 모든 타입에 쓰인다)
  await page.goto('/records/new?type=expense');
  await expect(
    page.getByRole('status').filter({ hasText: '오프라인이에요' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: '가계부 쓰기' }),
  ).toBeVisible();
  await page.getByLabel('금액').fill('5000');
  await page
    .getByRole('radiogroup', { name: '분류' })
    .getByRole('radio', { name: '식비' })
    .click();
  await page.getByLabel('제목').fill('오프라인 김밥');
  await page.getByRole('button', { name: '저장' }).click();

  // 저장은 서버를 기다리지 않는다: 기록 탭에 바로 보이고, 아직 안 보냈다는 구름이 붙는다
  await page.goto('/records');
  const item = page
    .getByRole('link', { name: /\[식비\] 오프라인 김밥/ })
    .filter({ visible: true })
    .first();
  await expect(item).toBeVisible();
  await expect(
    item.getByRole('img', { name: '아직 저장되지 않음' }),
  ).toBeVisible();

  // 연결이 돌아오면(online 이벤트) 대기열을 보내고 구름이 사라진다
  await context.setOffline(false);
  await expect(
    item.getByRole('img', { name: '아직 저장되지 않음' }),
  ).toHaveCount(0, { timeout: 15_000 });
});
