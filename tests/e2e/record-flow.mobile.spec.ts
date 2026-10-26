import { expect, test, type Page } from '@playwright/test';

// 모바일 기본 흐름 하나를 처음부터 끝까지 (아이폰 크기·터치).
// 주소로 화면을 바로 여는 page.goto는 로그인 화면에서만 쓰고, 나머지는 사용자처럼 앱 안을 눌러서 옮겨 간다:
// 실기기에서 찾은 "다시 연 화면이 튕김"(PR #74)은 앱 안에서 화면을 오갈 때만 생겼고, goto로 매번 새로 연 테스트는 놓쳤다.
// 체험 예시 기록 중 오늘 것은 가계부 2건(점심 9,800 + 택시 7,000 = 16,800원)이다 (src/features/records/sample)

// 토스트 문구. Radix Toast는 화면 읽기 프로그램에 알리려고 같은 글자를 한 벌 더 그려서(숨은 알림 영역) 두 개가 잡힌다 → 첫 번째
function toastText(page: Page, text: string) {
  return page.getByText(text).first();
}

function bottomTab(page: Page, name: string) {
  return page
    .getByRole('navigation', { name: '주요 메뉴' })
    .getByRole('link', { name, exact: true });
}

// 화면을 여러 번 오가는 긴 흐름이라 기본 제한(30초)보다 넉넉하게
const FLOW_TIMEOUT_MS = 120_000;
test.setTimeout(FLOW_TIMEOUT_MS);

test('+ → 가계부 쓰기 → 홈 요약 → 상세 → 수정 → 삭제·되돌리기 → 기록 탭 → 설정', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '로그인 없이 체험하기' }).click();
  await expect(page).toHaveURL('/');
  const daySummary = page.getByRole('region', { name: /월 \d+일/ });
  await expect(daySummary.getByText('가계부 2건')).toBeVisible();
  // 로딩 화면(AppSplash)이 걷힐 때까지. 아래 스와이프는 CDP로 손가락을 직접 움직여서, Playwright 클릭처럼
  // 위를 덮은 요소가 사라지기를 기다려 주지 않는다 (덮인 채로 밀어 달이 안 넘어갔다)
  await expect(
    page.getByRole('status').filter({ hasText: 'nanaki를 여는 중' }),
  ).toHaveCount(0);

  // 캘린더 좌우 스와이프 (Issue #32): 왼쪽으로 밀면 다음 달, 위아래로 밀면 그대로. 끝나면 "오늘"로 돌아와 흐름을 이어 간다.
  // 터치를 손가락처럼 움직이는 방법(CDP Input.dispatchTouchEvent)이 크로미움에만 있어 WebKit에서는 이 부분을 건너뛴다
  if (test.info().project.name !== 'mobile-webkit') {
    const grid = page.getByRole('grid');
    const titleOf = () =>
      grid.evaluate(
        (element) =>
          document.getElementById(element.getAttribute('aria-labelledby') ?? '')
            ?.textContent,
      );
    const startTitle = await titleOf();
    const box = await grid.boundingBox();
    if (!box) throw new Error('캘린더가 화면에 없다');
    const cdp = await page.context().newCDPSession(page);
    const drag = async (dx: number, dy: number) => {
      const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [from],
      });
      for (let step = 1; step <= 6; step += 1) {
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [
            { x: from.x + (dx * step) / 6, y: from.y + (dy * step) / 6 },
          ],
        });
      }
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
    };
    await drag(-150, 5);
    await expect.poll(titleOf).not.toBe(startTitle);
    const nextTitle = await titleOf();
    await drag(-40, -150);
    expect(await titleOf()).toBe(nextTitle);
    await page.getByRole('button', { name: /^오늘\(/ }).click();
    await expect.poll(titleOf).toBe(startTitle);
    await expect(daySummary.getByText('가계부 2건')).toBeVisible();
  }

  // 작성: 스피드 다이얼 → 가계부. 작성 화면에는 하단 탭이 없고, 저장 버튼이 화면 안에 보인다
  await page.getByRole('button', { name: '새 기록 쓰기' }).click();
  await page.getByRole('menuitem', { name: '가계부 쓰기' }).click();
  await expect(
    page.getByRole('heading', { name: '가계부 쓰기' }),
  ).toBeVisible();
  await expect(page.getByRole('navigation', { name: '주요 메뉴' })).toHaveCount(
    0,
  );
  await page.getByLabel('금액').fill('5000');
  await page
    .getByRole('radiogroup', { name: '분류' })
    .getByRole('radio', { name: '식비' })
    .click();
  await page.getByLabel('제목').fill('편의점');
  // 저장 줄은 화면 아래에 붙어 따라오지 않고 폼 끝 제자리에 있다 (따라오면 메모 칸을 덮었다, 2026-10-25 아이폰 확인 10).
  // 끝까지 내리면 홈 막대에 가리지 않고 보인다
  await page.getByLabel('제목').blur();
  const saveButton = page.getByRole('button', { name: '저장' });
  await saveButton.scrollIntoViewIfNeeded();
  await expect(saveButton).toBeInViewport();
  await saveButton.click();

  // 홈 요약에 바로 반영 → 펼쳐서 상세로
  await expect(page).toHaveURL('/');
  await expect(daySummary.getByText('가계부 3건')).toBeVisible();
  await daySummary.getByRole('button', { name: /가계부 3건/ }).click();
  await daySummary.getByRole('link', { name: /\[식비\] 편의점/ }).click();
  // 홈 하루 요약에서 연 상세는 주소에 들어온 곳(back=home)이 붙고, 뒤로 버튼이 홈의 그 날짜로 간다 (detailOrigin)
  await expect(page).toHaveURL(/\/records\/view\?back=home&date=.*&id=/);
  await expect(
    page.getByRole('link', { name: '홈으로 돌아가기' }),
  ).toHaveAttribute('href', /^\/\?date=/);
  await expect(
    page.getByRole('heading', { level: 1, name: '편의점' }),
  ).toBeVisible();

  // 수정: 모바일은 ⋯ 메뉴 안에 있다. 저장하면 상세로 돌아온다
  await page.getByRole('button', { name: '더보기' }).click();
  await page.getByRole('menuitem', { name: '수정' }).click();
  await expect(
    page.getByRole('heading', { name: '가계부 수정' }),
  ).toBeVisible();
  await page.getByLabel('제목').fill('편의점 간식');
  await page.getByRole('button', { name: '저장' }).click();
  // 수정을 거쳐도 들어온 곳(back=home)이 남는다
  await expect(page).toHaveURL(/\/records\/view\?back=home&date=.*&id=/);
  await expect(
    page.getByRole('heading', { level: 1, name: '편의점 간식' }),
  ).toBeVisible();

  // 삭제 → 홈으로 와서 5초 동안 되돌리기
  await page.getByRole('button', { name: '더보기' }).click();
  await page.getByRole('menuitem', { name: '삭제' }).click();
  await expect(page).toHaveURL('/');
  await expect(toastText(page, '기록을 삭제했어요')).toBeVisible();
  await expect(daySummary.getByText('가계부 2건')).toBeVisible();
  await page.getByRole('button', { name: '되돌리기' }).click();
  await expect(toastText(page, '기록을 되돌렸어요')).toBeVisible();
  await expect(daySummary.getByText('가계부 3건')).toBeVisible();

  // 하단 탭 → 기록 탭: 고친 제목이 최근 기록에 있다
  await bottomTab(page, '기록').click();
  await expect(page).toHaveURL('/records');
  await expect(
    page
      .getByRole('link', { name: /\[식비\] 편의점 간식/ })
      .filter({ visible: true }),
  ).toBeVisible();

  // 검색창 옆 ⚙ → 설정 → ‹ 는 들어온 곳(기록 탭)으로 (PR #75)
  await page
    .getByRole('link', { name: '설정' })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL('/settings?from=records');
  await page.getByRole('link', { name: '기록으로' }).click();
  await expect(page).toHaveURL('/records');

  // 한 번 닫은 작성 화면을 다른 타입으로 다시 연다 (PR #74의 튕김)
  await bottomTab(page, '홈').click();
  await expect(page).toHaveURL('/');
  for (const menu of ['운동 기록', '가계부 쓰기']) {
    await page.getByRole('button', { name: '새 기록 쓰기' }).click();
    await page.getByRole('menuitem', { name: menu }).click();
    await expect(page.getByRole('heading', { name: menu })).toBeVisible();
    await page.getByRole('link', { name: '닫기' }).click();
    await expect(page).toHaveURL('/');
  }
});
