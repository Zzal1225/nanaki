import { describe, expect, it } from 'vitest';
import {
  remainingMaxMs,
  remainingMinMs,
  SPLASH_MAX_MS,
  SPLASH_MIN_MS,
} from './splashRules';

describe('로딩 화면 시간 계산', () => {
  it('새로 연 페이지: 하이드레이션까지 걸린 시간을 최소 1초에서 뺀다', () => {
    expect(remainingMinMs(400, 0)).toBe(SPLASH_MIN_MS - 400);
    // 하이드레이션이 1초보다 늦으면 최소 시간은 이미 지났다
    expect(remainingMinMs(1_500, 0)).toBe(0);
    expect(remainingMaxMs(1_500, 0)).toBe(SPLASH_MAX_MS - 1_500);
  });

  it('앱 안 이동(체험하기 뒤 홈): 그 화면을 그린 때부터 센다', () => {
    expect(remainingMinMs(20_300, 20_000)).toBe(SPLASH_MIN_MS - 300);
    expect(remainingMaxMs(20_300, 20_000)).toBe(SPLASH_MAX_MS - 300);
  });

  it('최대 시간을 넘기면 0 (바로 사라짐)', () => {
    expect(remainingMaxMs(9_000, 0)).toBe(0);
  });
});
