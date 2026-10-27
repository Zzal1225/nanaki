import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio, MIN_TEXT_CONTRAST } from './contrast';

const tokens = JSON.parse(
  readFileSync(join(process.cwd(), 'tokens/tokens.json'), 'utf8'),
);
const globalsCss = readFileSync(
  join(process.cwd(), 'src/app/globals.css'),
  'utf8',
);
const login = tokens.exceptions['login-screen'].colors;

describe('대비 계산 (WCAG)', () => {
  it('흰색/검정은 21:1, 같은 색은 1:1', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#2e7d4f', '#2e7d4f')).toBeCloseTo(1, 5);
  });
});

// 2026-10-27 배포 Lighthouse: 슬로건(#ddf2e5 on #2e7d4f)이 4.3:1로 기준 미만 → #eef8f2 (사용자 결정 A)
describe('로그인 화면 글자 대비 (tokens.json exceptions.login-screen)', () => {
  it.each([
    ['nanaki·나나키·체험하기 (foreground)', login.foreground],
    ['슬로건·안내 문구 (foreground-sub)', login['foreground-sub']],
  ])('%s는 초록 바탕에서 본문 기준 4.5:1 이상', (_, color) => {
    expect(contrastRatio(color, login.background)).toBeGreaterThanOrEqual(
      MIN_TEXT_CONTRAST,
    );
  });

  it('globals.css의 CSS 변수가 토큰과 같다 (토큰이 유일한 원본)', () => {
    expect(globalsCss.toLowerCase()).toContain(
      `--login-fg-sub: ${login['foreground-sub'].toLowerCase()};`,
    );
    expect(globalsCss.toLowerCase()).toContain(
      `--login-bg: ${login.background.toLowerCase()};`,
    );
  });
});
