import type { Page } from '@playwright/test';

// 아이폰 실기기에서 반복해서 나온 문제 중, 브라우저 흉내로 미리 잡을 수 있는 것 (docs/real-device-checklist.md 참고).
// 화면 하나를 검사해 어긴 곳을 글로 돌려준다. 빈 배열이면 통과.
// 실기기에서만 보이는 것(상태 표시줄·홈 막대 안전 영역, 실제 키보드)은 여기서 흉내 내지 않는다: 흉내가 맞는지 확인할 방법이 없다

// 아이폰은 글자가 16px보다 작은 입력칸을 누르면 화면을 확대하고 되돌리지 않는다 (2026-10-22 PR #74)
const MIN_INPUT_FONT_PX = 16;
// 터치 영역 (CLAUDE.md: 44px은 모든 구간)
const MIN_TOUCH_TARGET_PX = 44;

export type ScreenProblems = {
  smallInputs: string[];
  horizontalOverflow: string[];
  smallTouchTargets: string[];
};

export async function findMobileProblems(page: Page): Promise<ScreenProblems> {
  return page.evaluate(
    ({ minFont, minTarget }) => {
      // 요소를 사람이 알아볼 이름으로: 화면 읽기 이름 → 보이는 글자 → 태그
      function describe(element: Element): string {
        const name =
          element.getAttribute('aria-label') ??
          (element.textContent ?? '').trim().slice(0, 20);
        return `${element.tagName.toLowerCase()} "${name}"`;
      }
      function isShown(element: Element): boolean {
        const rect = element.getBoundingClientRect();
        // sr-only(1px)·숨김은 누를 수 없으니 뺀다
        if (rect.width <= 1 || rect.height <= 1) return false;
        if (element.closest('[aria-hidden="true"], [hidden], [inert]'))
          return false;
        return getComputedStyle(element).visibility !== 'hidden';
      }

      // 화면에 키보드를 띄우는 칸만. 체크·라디오·숨은 칸은 확대와 상관없다.
      // 파일 칸(사진 고르기)도 키보드가 아니라 사진 선택 창을 열어 뺀다 (37b2: 쓰기 화면 사진 칸의 숨은 input이 14px로 걸렸다)
      const inputs = document.querySelectorAll(
        'input:not([type="hidden"], [type="checkbox"], [type="radio"], [type="file"]), textarea, select',
      );
      const smallInputs = [...inputs]
        .filter(
          (element) => parseFloat(getComputedStyle(element).fontSize) < minFont,
        )
        .map(
          (element) =>
            `${describe(element)} ${getComputedStyle(element).fontSize}`,
        );

      const overflow = document.documentElement.scrollWidth - window.innerWidth;
      const horizontalOverflow =
        overflow > 0 ? [`가로로 ${overflow}px 넘침`] : [];

      // 누를 수 있는 것: 링크·버튼과 버튼 역할을 하는 것들. 입력칸 자체는 높이가 규칙(h-12)으로 정해져 있어 뺀다
      const targets = document.querySelectorAll(
        'a[href], button, [role="button"], [role="menuitem"], [role="radio"], [role="switch"], [role="tab"], [role="checkbox"]',
      );
      const smallTouchTargets = [...targets]
        .filter(isShown)
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width < minTarget || rect.height < minTarget;
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return `${describe(element)} ${Math.round(rect.width)}×${Math.round(rect.height)}`;
        });

      return { smallInputs, horizontalOverflow, smallTouchTargets };
    },
    { minFont: MIN_INPUT_FONT_PX, minTarget: MIN_TOUCH_TARGET_PX },
  );
}
