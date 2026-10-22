import { describe, expect, it } from 'vitest';
import { computeKeyboardInset, isHiddenByKeyboard } from './keyboardMetrics';

describe('키보드가 가린 높이', () => {
  it('창 높이 - 보이는 높이 (키보드가 떠 있을 때)', () => {
    expect(computeKeyboardInset(793, 457, 1)).toBe(336);
  });

  it('작은 차이(주소창 접힘)와 손가락 확대는 키보드가 아니다', () => {
    expect(computeKeyboardInset(793, 740, 1)).toBe(0);
    expect(computeKeyboardInset(793, 400, 2)).toBe(0);
  });
});

describe('칸이 키보드에 가렸는지', () => {
  it('칸 아래쪽 + 여유가 보이는 높이를 넘으면 가렸다', () => {
    expect(isHiddenByKeyboard(450, 457, 16)).toBe(true);
    expect(isHiddenByKeyboard(300, 457, 16)).toBe(false);
  });
});
