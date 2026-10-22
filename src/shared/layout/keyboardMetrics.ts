// 화면 키보드가 가린 높이 계산 (KeyboardInset이 쓴다). 순수 함수라 브라우저 없이 테스트한다.
//
// 아이폰은 키보드가 올라와도 창(레이아웃) 높이(innerHeight)는 그대로고, 보이는 영역(visualViewport.height)만 줄어든다.
// 그 차이가 키보드(+ 위의 자동완성 줄) 높이다.

// 이보다 작은 차이는 키보드가 아니다 (주소창이 접히고 펴질 때 수십 px 움직인다)
export const MIN_KEYBOARD_PX = 120;

export function computeKeyboardInset(
  layoutHeight: number,
  visibleHeight: number,
  scale: number,
): number {
  // 손가락으로 확대하면(scale > 1) 보이는 영역이 줄어드는데 키보드가 아니다
  if (scale !== 1) return 0;
  const inset = Math.round(layoutHeight - visibleHeight);
  return inset >= MIN_KEYBOARD_PX ? inset : 0;
}

// 포커스된 칸의 아래쪽이 키보드에 가렸는지 (칸 아래 여유 margin까지 보여야 "보인다")
export function isHiddenByKeyboard(
  fieldBottom: number,
  visibleHeight: number,
  margin: number,
): boolean {
  return fieldBottom + margin > visibleHeight;
}
