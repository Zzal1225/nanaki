import { expect, test } from '@playwright/test';

// 한 번 떠난 화면에 다시 들어가기 (2026-10-22 아이폰 확인에서 찾은 문제).
// Next 16(cacheComponents)은 떠난 화면을 숨겨 둔 채 지금 주소로 다시 그린다. 그때 "주소가 틀렸으니 옮기기"를
// 그리는 중 redirect()로 하면, 다음에 그 화면을 열 때 곧바로 홈·기록 탭으로 튕겼다 (src/shared/navigation/useReplaceRoute).
// 단위 테스트(jsdom)에는 Next 라우터의 숨김이 없어서 실제 빌드로만 확인할 수 있다
test('작성 화면·타입 화면을 닫았다가 다시 열어도 그 화면이 열린다', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '로그인 없이 체험하기' }).click();
  await expect(page).toHaveURL('/');

  // 작성: 가계부 → 닫기 → 운동 → 닫기 → 가계부 (같은 타입 다시 열기도 튕겼다)
  const types = [
    { menu: '가계부 쓰기', type: 'expense' },
    { menu: '운동 기록', type: 'workout' },
    { menu: '가계부 쓰기', type: 'expense' },
  ];
  for (const { menu, type } of types) {
    await page.getByRole('button', { name: '새 기록' }).click();
    await page.getByRole('menuitem', { name: menu }).click();
    await expect(page).toHaveURL(`/records/new?type=${type}`);
    await expect(page.getByRole('heading', { name: menu })).toBeVisible();
    await page.getByRole('link', { name: '닫기' }).click();
    await expect(page).toHaveURL('/');
  }

  // 타입 화면: 기록 탭 → 가계부 화면 → 홈, 두 번
  // PC에서는 하단 탭이 숨어 있어 보이는 "주요 메뉴"는 사이드바 하나다
  const sidebar = page
    .getByRole('navigation', { name: '주요 메뉴' })
    .filter({ visible: true });
  for (let round = 0; round < 2; round += 1) {
    await sidebar.getByRole('link', { name: '기록', exact: true }).click();
    await expect(page).toHaveURL('/records');
    await page
      .locator('a[href^="/records/type/expense"]')
      .filter({ visible: true })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { level: 1, name: '가계부', exact: true }),
    ).toBeVisible();
    // 튕길 때는 화면이 잠깐 보인 뒤(다시 보일 때의 effect) 기록 탭으로 옮겨졌다. 잠시 뒤에도 주소가 그대로인지 본다
    await page.waitForTimeout(1_000);
    await expect(page).toHaveURL(/\/records\/type\/expense/);
    await sidebar.getByRole('link', { name: '홈', exact: true }).click();
    await expect(page).toHaveURL('/');
  }

  // PC 타입 상세는 왼쪽 목록 자리에 (Issue #30): 그 목록에서 기록을 열어도 왼쪽은 가계부 목록 그대로, 연 기록에 선택 표시.
  // 예전에는 타입 상세가 오른쪽에 열려 기록을 누르면 보던 목록이 사라졌다
  await sidebar.getByRole('link', { name: '기록', exact: true }).click();
  await page
    .locator('a[href^="/records/type/expense"]')
    .filter({ visible: true })
    .first()
    .click();
  const list = page.getByRole('complementary', { name: '기록 목록' });
  await expect(
    list.getByRole('heading', { level: 1, name: '가계부', exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByText('기록을 고르면 여기에 보여요')
      // 떠난 기록 탭 화면도 숨은 채 같은 안내를 들고 있다(cacheComponents)
      .filter({ visible: true }),
  ).toBeVisible();
  const first = list.getByRole('listitem').getByRole('link').first();
  await first.click();
  await expect(page).toHaveURL(/\/records\/view\?.*back=type/);
  await expect(
    list.getByRole('heading', { level: 1, name: '가계부', exact: true }),
  ).toBeVisible();
  await expect(first).toHaveAttribute('aria-current', 'page');
});
