import { expect, test, type Page } from '@playwright/test';

// 모바일 기본 흐름 하나를 처음부터 끝까지 (아이폰 크기·터치).
// 주소로 화면을 바로 여는 page.goto는 로그인 화면에서만 쓰고, 나머지는 사용자처럼 앱 안을 눌러서 옮겨 간다:
// 실기기에서 찾은 "다시 연 화면이 튕김"(PR #74)은 앱 안에서 화면을 오갈 때만 생겼고, goto로 매번 새로 연 테스트는 놓쳤다.
// 체험 예시 기록 중 오늘 것은 가계부 2건(점심 9,800 + 택시 7,000 = 16,800원)이다 (src/features/records/sample)

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
  await expect(page.getByRole('button', { name: '저장' })).toBeInViewport();
  await page.getByRole('button', { name: '저장' }).click();

  // 홈 요약에 바로 반영 → 펼쳐서 상세로
  await expect(page).toHaveURL('/');
  await expect(daySummary.getByText('가계부 3건')).toBeVisible();
  await daySummary.getByRole('button', { name: /가계부 3건/ }).click();
  await daySummary.getByRole('link', { name: /\[식비\] 편의점/ }).click();
  await expect(page).toHaveURL(/\/records\/view\?id=/);
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
  await expect(page).toHaveURL(/\/records\/view\?id=/);
  await expect(
    page.getByRole('heading', { level: 1, name: '편의점 간식' }),
  ).toBeVisible();

  // 삭제 → 홈으로 와서 5초 동안 되돌리기
  await page.getByRole('button', { name: '더보기' }).click();
  await page.getByRole('menuitem', { name: '삭제' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByText('기록을 삭제했어요')).toBeVisible();
  await expect(daySummary.getByText('가계부 2건')).toBeVisible();
  await page.getByRole('button', { name: '되돌리기' }).click();
  await expect(page.getByText('기록을 되돌렸어요')).toBeVisible();
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
