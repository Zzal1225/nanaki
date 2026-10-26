import { expect, test, type Page } from '@playwright/test';
import { findMobileProblems } from './helpers/mobileChecks';

// 아이폰 단골 함정 검사: 주요 화면을 앱 안에서 차례로 열며, 화면마다 같은 검사를 한다 (helpers/mobileChecks).
// - 입력칸 글자 16px 미만 (아이폰이 화면을 확대함)
// - 가로 넘침 (좁은 화면에서 옆으로 밀림)
// - 터치 영역 44px 미만
// 처음 돌렸을 때 루틴 만들기의 선택 버튼(34px)과 설정의 스위치(실제로 눌리는 곳 26px)가 걸려 함께 고쳤다.
// 실기기에서만 보이는 것(상태 표시줄·홈 막대, 실제 키보드)은 docs/real-device-checklist.md로 확인한다

// 한 화면이 걸려도 멈추지 않고 나머지 화면까지 본다 (soft). 실패 메시지에 화면 이름과 어긴 요소가 나온다
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

// 화면을 여러 번 오가는 긴 흐름이라 기본 제한(30초)보다 넉넉하게
const FLOW_TIMEOUT_MS = 120_000;
test.setTimeout(FLOW_TIMEOUT_MS);

test('주요 화면에 아이폰 단골 함정이 없다', async ({ page }) => {
  await page.goto('/login');
  await expectNoProblems(page, '로그인');
  await page.getByRole('button', { name: '로그인 없이 체험하기' }).click();
  await expect(page).toHaveURL('/');

  const daySummary = page.getByRole('region', { name: /월 \d+일/ });
  await expect(daySummary.getByText('가계부 2건')).toBeVisible();
  await daySummary.getByRole('button', { name: /가계부 2건/ }).click();
  await expectNoProblems(page, '홈 (하루 요약 펼침)');

  // 스피드 다이얼 메뉴와 작성 화면 다섯 가지 (입력칸 종류가 타입마다 다르다)
  const forms = [
    { menu: '가계부 쓰기', closesTo: '/' },
    { menu: '후기 쓰기', closesTo: '/' },
    { menu: '운동 기록', closesTo: '/' },
    { menu: '체형 기록', closesTo: '/' },
    // 루틴 만들기는 닫으면 루틴 화면으로 간다
    { menu: '루틴 만들기', closesTo: '/records/type/routine' },
  ];
  for (const [index, { menu, closesTo }] of forms.entries()) {
    await page.getByRole('button', { name: '새 기록 쓰기' }).click();
    if (index === 0) await expectNoProblems(page, '스피드 다이얼 메뉴');
    await page.getByRole('menuitem', { name: menu }).click();
    await expect(page.getByRole('heading', { name: menu })).toBeVisible();
    await expectNoProblems(page, `작성: ${menu}`);
    await page.getByRole('link', { name: '닫기' }).click();
    await expect(page).toHaveURL(closesTo);
    if (closesTo !== '/') {
      await expectNoProblems(page, '루틴 화면');
      await bottomTab(page, '홈').click();
      await expect(page).toHaveURL('/');
    }
  }

  // 기록 탭 → 상세 (⋯ 메뉴 포함)
  await bottomTab(page, '기록').click();
  await expect(page).toHaveURL('/records');
  const lunch = page
    .getByRole('link', { name: /\[식비\] 점심/ })
    .filter({ visible: true });
  await expect(lunch).toBeVisible();
  await expectNoProblems(page, '기록 탭');
  await lunch.click();
  await expect(page).toHaveURL(/\/records\/view\?id=/);
  await page.getByRole('button', { name: '더보기' }).click();
  await expectNoProblems(page, '기록 상세 (⋯ 메뉴)');
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: '기록 탭으로 돌아가기' }).click();
  await expect(page).toHaveURL('/records');

  // 검색: 글자를 치는 동안 하단 탭·스피드 다이얼이 숨는다 (터치 기기, PR #74)
  await page
    .getByRole('link', { name: '기록 검색' })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL('/records/search');
  const searchBox = page
    .getByRole('searchbox', { name: '검색어' })
    .filter({ visible: true });
  await searchBox.focus();
  await expect(
    page.getByRole('navigation', { name: '주요 메뉴' }),
  ).toBeHidden();
  await expect(page.getByRole('button', { name: '새 기록 쓰기' })).toBeHidden();
  await searchBox.fill('점심');
  await searchBox.press('Enter');
  await expect(page).toHaveURL(/q=/);
  await searchBox.blur();
  await expect(
    page.getByRole('navigation', { name: '주요 메뉴' }),
  ).toBeVisible();
  await expectNoProblems(page, '검색 결과');

  // 필터 시트 (모바일 바텀시트): 가계부를 고르면 필터 버튼이 생긴다
  await page
    .getByRole('button', { name: /^가계부/ })
    .filter({ visible: true })
    .click();
  await page
    .getByRole('button', { name: /^필터/ })
    .filter({ visible: true })
    .click();
  await expect(page.getByRole('dialog', { name: '필터' })).toBeVisible();
  await expectNoProblems(page, '필터 시트');
  // 필터를 걸면 필터 버튼에 개수 배지가 붙는다. 배지가 화면 끝을 넘어 화면이 좌우로 밀렸다 (2026-10-26 아이폰 확인)
  const sheet = page.getByRole('dialog', { name: '필터' });
  await sheet.getByRole('button', { name: '식비', exact: true }).click();
  await sheet.getByRole('button', { name: /개 결과 보기$/ }).click();
  await expect(sheet).toBeHidden();
  await expect(
    page
      .getByRole('button', { name: /^필터, 1개 적용됨/ })
      .filter({ visible: true }),
  ).toBeVisible();
  await expectNoProblems(page, '필터 적용 뒤 (개수 배지)');

  // 설정 (기록 탭의 ⚙에서)
  await page
    .getByRole('link', { name: '기록 탭으로 돌아가기' })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL('/records');
  await page
    .getByRole('link', { name: '설정' })
    .filter({ visible: true })
    .click();
  await expect(page.getByRole('switch', { name: '가계부' })).toBeVisible();
  await expectNoProblems(page, '설정');
});
