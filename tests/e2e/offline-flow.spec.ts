import { expect, test, type Page } from '@playwright/test';

// 오프라인 보기 (25a 실험 → 25b 기기 사본).
// 25a에서는 연 화면의 틀만 뜨고 기록은 회색 자리에 멈췄다(TanStack이 오프라인 조회를 멈춤).
// 25b부터 기록은 기기 사본(IndexedDB)에서 읽어서, 연결이 끊겨도 마지막으로 받은 기록이 그대로 보여야 한다.
// 아직 안 되는 것: 연 적 없는 화면(특히 기록마다 주소가 다른 상세)은 오프라인 대체 화면 → 25c에서 다룬다

// 서비스 워커가 이 페이지를 맡을 때까지 기다린다. 처음 방문에서는 등록만 되고, clientsClaim으로 곧 넘어온다
async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller !== null,
    undefined,
    { timeout: 15_000 },
  );
}

// PC 기록 탭은 같은 목록이 두 벌(왼쪽 패널 + 숨은 본문) 있다. 보이는 쪽만 본다
function visibleText(page: Page, text: string | RegExp) {
  return page.getByText(text).filter({ visible: true }).first();
}

test('오프라인: 연 화면은 기기 사본의 기록으로 그려지고, 검색도 사본에서 찾는다', async ({
  page,
  context,
}) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '로그인 없이 체험하기' }).click();
  await expect(page).toHaveURL('/');
  await waitForServiceWorker(page);

  // 온라인에서 기록 탭·검색 화면을 연다 (서비스 워커가 화면을, 기기 사본이 기록을 저장해 둔다)
  await page.goto('/records');
  await expect(visibleText(page, '[식비] 점심')).toBeVisible();
  await page.goto('/records/search');
  await expect(
    page.getByRole('searchbox', { name: '검색어' }).filter({ visible: true }),
  ).toBeVisible();

  // 오프라인에서 화면이 무엇을 하는지 실패 때 볼 수 있게 콘솔·페이지 오류를 모은다
  const logs: string[] = [];
  page.on('console', (message) =>
    logs.push(`[console.${message.type()}] ${message.text()}`),
  );
  page.on('pageerror', (error) => logs.push(`[pageerror] ${error.message}`));

  await context.setOffline(true);

  // (1) 연 적 있는 화면을 새로 고쳐도 기록이 보인다 (서버에 못 물어도 사본으로)
  await page.goto('/records');
  try {
    await expect(visibleText(page, '[식비] 점심')).toBeVisible();
  } catch (error) {
    // 진단: 사본이 있는지, 조회가 실패해 다시 시도하는 중인지(재시도가 끝나면 오류 안내가 뜬다)
    const databases = await page.evaluate(async () => {
      const names = (await indexedDB.databases()).map((db) => db.name ?? '');
      const counts = await Promise.all(
        names
          .filter((name) => name.startsWith('nanaki-'))
          .map(
            (name) =>
              new Promise<string>((resolve) => {
                const open = indexedDB.open(name);
                open.onsuccess = () => {
                  const request = open.result
                    .transaction('records')
                    .objectStore('records')
                    .count();
                  request.onsuccess = () =>
                    resolve(`${name} records=${request.result}`);
                  request.onerror = () => resolve(`${name} count 실패`);
                };
                open.onerror = () => resolve(`${name} 열기 실패`);
              }),
          ),
      );
      // 인증 라이브러리가 브라우저 잠금(navigator.locks)을 쥔 채 멈췄는지
      const locks = await navigator.locks.query();
      return [
        ...counts,
        `held=${(locks.held ?? []).map((lock) => lock.name).join('|')}`,
        `pending=${(locks.pending ?? []).map((lock) => lock.name).join('|')}`,
      ];
    });
    // DEBUG(임시): 읽기 경로 단계 기록
    const trace = await page.evaluate(
      () =>
        (globalThis as unknown as { __offlineTrace?: string[] })
          .__offlineTrace ?? ['기록 없음'],
    );
    databases.push(...trace);
    await page.waitForTimeout(10_000);
    const hasErrorNotice =
      (await page
        .getByText('기록을 불러오지 못했어요')
        .filter({ visible: true })
        .count()) > 0;
    console.log(
      [
        `[오프라인 진단] IndexedDB: ${databases.join(', ')}`,
        `[오프라인 진단] 10초 뒤 오류 안내: ${hasErrorNotice}`,
        ...logs,
      ].join('\n'),
    );
    throw error;
  }

  // (2) 검색: 주소만 바꾸고(서버에 묻지 않음) 사본에서 찾는다. 메모("원두")로 찾기
  await page.goto('/records/search');
  const searchBox = page
    .getByRole('searchbox', { name: '검색어' })
    .filter({ visible: true });
  await searchBox.fill('원두');
  await searchBox.press('Enter');
  await expect(visibleText(page, /동네 로스터리/)).toBeVisible();

  // (3) 연 적 없는 화면은 아직 대체 화면 (25c에서 다룬다)
  await page.goto('/records/type/expense');
  await expect(
    page.getByRole('heading', { name: '오프라인이에요' }),
  ).toBeVisible();

  await context.setOffline(false);
});
