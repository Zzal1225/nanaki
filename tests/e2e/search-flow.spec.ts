import { expect, test } from '@playwright/test';

// 검색 흐름: 진짜 DB(PostgREST)에 검색어 필터가 가고, 결과에서 연 상세 옆에 결과가 남는지 (PC 1280).
// 체험 예시 기록: "동네 로스터리" 후기의 메모에 "원두", "아메리카노" 가계부의 분류가 "카페" (src/features/records/sample)
test('기록 탭 검색창 → 메모·분류로 찾기 → 결과에서 상세 열기', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '로그인 없이 체험하기' }).click();
  await expect(page).toHaveURL('/');

  await page.goto('/records');
  // PC는 기록 탭 목록이 왼쪽 패널과 (숨은) 본문에 두 벌 있다. 보이는 쪽을 누른다
  await page
    .getByRole('link', { name: '기록 검색' })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL('/records/search');

  const searchBox = page
    .getByRole('searchbox', { name: '검색어' })
    .filter({ visible: true });
  // 메모로 찾기
  await searchBox.fill('원두');
  await searchBox.press('Enter');
  await expect(page).toHaveURL(/q=%EC%9B%90%EB%91%90/);
  const results = page.getByRole('complementary', { name: '기록 목록' });
  await expect(results.getByRole('status')).toHaveText('1개');
  await expect(
    results.getByRole('link', { name: /동네 로스터리/ }),
  ).toBeVisible();

  // 분류(선택 칸)로 찾기
  await searchBox.fill('카페');
  await searchBox.press('Enter');
  const coffee = results.getByRole('link', { name: /\[카페\] 아메리카노/ });
  await expect(coffee).toBeVisible();

  // 가계부를 고르고 필터 시트(PC는 오른쪽 패널)에서 분류 "카페"로 좁힌다
  await results.getByRole('button', { name: /^가계부/ }).click();
  await results.getByRole('button', { name: '필터' }).click();
  const sheet = page.getByRole('dialog', { name: '필터' });
  await sheet.getByRole('button', { name: '카페', exact: true }).click();
  await sheet.getByRole('button', { name: /개 결과 보기$/ }).click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/category=%EC%B9%B4%ED%8E%98/);
  await expect(
    results.getByRole('button', { name: '분류 카페 필터 풀기' }),
  ).toBeVisible();
  await expect(coffee).toBeVisible();

  // 결과를 열면 오른쪽에 상세, 왼쪽에는 결과가 남는다
  await coffee.click();
  await expect(page).toHaveURL(/\/records\/[^/?]+\?q=/);
  await expect(page.getByRole('heading', { name: '아메리카노' })).toBeVisible();
  await expect(coffee).toHaveAttribute('aria-current', 'page');
});
