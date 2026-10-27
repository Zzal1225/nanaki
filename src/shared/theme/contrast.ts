// WCAG 대비(contrast ratio) 계산. 색 토큰을 고를 때 글자와 바탕이 기준(본문 4.5:1)을 넘는지 테스트로 지킨다.
// 화면을 그려서 재는 검사(Lighthouse)는 등장 애니메이션 중이면 투명한 글자를 건너뛰어 놓칠 수 있다
// (2026-10-27: CI는 로그인 슬로건을 100점으로, 배포 측정은 4.3:1로 잡았다) → 토큰 값으로 바로 계산한다

function channel(value: number): number {
  const c = value / 255;
  // sRGB 감마를 풀어 실제 밝기로 (WCAG 2.x 상대 휘도 공식)
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (light + 0.05) / (dark + 0.05);
}

// 본문 글자 기준 (WCAG AA). 큰 글자(24px 이상, 굵게 18.66px 이상)는 3:1
export const MIN_TEXT_CONTRAST = 4.5;
