import { expect, test } from '@playwright/test';

// step1의 핵심 흐름 하나: 처음 온 사람이 로그인 없이 들어와(예시 기록), 기록을 하나 남기고, 캘린더에서 바로 확인한다.
// 체험 예시 기록 중 오늘 것은 가계부 2건(점심 9,800 + 택시 7,000 = 16,800원)이다 (src/features/records/sample)
test('체험하기 → 가계부 쓰기 → 홈 캘린더의 오늘 요약에 반영', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '로그인 없이 체험하기' }).click();

  // 예시 기록이 들어간 채로 홈에 도착한다
  await expect(page).toHaveURL('/');
  const daySummary = page.getByRole('region', { name: /월 \d+일/ });
  await expect(daySummary.getByText('가계부 2건')).toBeVisible();
  await expect(daySummary.getByText('-16,800원')).toBeVisible();

  // 사이드바 "새 기록" → "가계부 쓰기"
  await page.getByRole('button', { name: '새 기록' }).click();
  await page.getByRole('menuitem', { name: '가계부 쓰기' }).click();
  await expect(
    page.getByRole('heading', { name: '가계부 쓰기' }),
  ).toBeVisible();

  // 날짜는 기본값(오늘) 그대로
  await page.getByLabel('금액').fill('5000');
  await page
    .getByRole('group', { name: '분류' })
    .getByText('식비', { exact: true })
    .click();
  await page.getByLabel('제목').fill('편의점');
  await page.getByRole('button', { name: '저장' }).click();

  // 저장하면 홈으로 돌아오고, 오늘 요약이 바로 바뀐다 (캐시 무효화 → 다시 불러오기)
  await expect(page).toHaveURL('/');
  await expect(daySummary.getByText('가계부 3건')).toBeVisible();
  await expect(daySummary.getByText('-21,800원')).toBeVisible();

  // 펼치면 방금 쓴 기록이 목록에 있다
  await daySummary.getByRole('button', { name: /가계부 3건/ }).click();
  await expect(
    daySummary.getByRole('link', { name: /편의점 · 식비/ }),
  ).toBeVisible();
});
