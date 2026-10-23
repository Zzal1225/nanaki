import { describe, expect, it } from 'vitest';
import {
  clampView,
  dragView,
  formatPercent,
  INITIAL_VIEW,
  layoutCrop,
  OFFSET_MAX,
  ZOOM_MAX,
  ZOOM_MIN,
} from './photoCrop';

describe('layoutCrop (틀 안 사진 자리)', () => {
  it('3:4 사진은 처음에 틀과 딱 맞는다', () => {
    expect(layoutCrop({ width: 1200, height: 1600 }, INITIAL_VIEW)).toEqual({
      left: 0,
      top: 0,
      width: 1,
      height: 1,
    });
  });

  it('가로 사진(4:3)은 높이를 맞추고 가로가 양쪽으로 같게 넘친다', () => {
    const layout = layoutCrop({ width: 4000, height: 3000 }, INITIAL_VIEW);
    expect(layout.height).toBe(1);
    // 4/3 ÷ 3/4 = 16/9
    expect(layout.width).toBeCloseTo(16 / 9);
    expect(layout.left).toBeCloseTo(-(16 / 9 - 1) / 2);
    expect(layout.top).toBe(0);
  });

  it('아주 긴 세로 사진(9:16)은 너비를 맞추고 세로가 넘친다', () => {
    const layout = layoutCrop({ width: 900, height: 1600 }, INITIAL_VIEW);
    expect(layout.width).toBe(1);
    expect(layout.height).toBeCloseTo(0.75 / (9 / 16));
  });

  it('확대 0.5면 틀 가운데 절반 크기로 (빈 곳이 생긴다), 위치는 그대로 옮겨진다', () => {
    const layout = layoutCrop(
      { width: 1200, height: 1600 },
      { zoom: 0.5, offsetX: 0.1, offsetY: -0.2 },
    );
    expect(layout.left).toBeCloseTo(0.35);
    expect(layout.top).toBeCloseTo(0.05);
    expect(layout.width).toBe(0.5);
    expect(layout.height).toBe(0.5);
  });
});

describe('clampView · dragView', () => {
  it('확대·위치는 정한 범위 안으로', () => {
    expect(clampView({ zoom: 10, offsetX: 2, offsetY: -2 })).toEqual({
      zoom: ZOOM_MAX,
      offsetX: OFFSET_MAX,
      offsetY: -OFFSET_MAX,
    });
    expect(clampView({ zoom: 0.1, offsetX: 0, offsetY: 0 }).zoom).toBe(
      ZOOM_MIN,
    );
  });

  it('소수 오차를 정리한다 (1.1 + 0.05 단계가 1.1500000000000001이 되지 않게)', () => {
    expect(clampView({ zoom: 1.1 + 0.05, offsetX: 0, offsetY: 0 }).zoom).toBe(
      1.15,
    );
  });

  it('끌어 옮긴 px를 틀 크기 비율로 바꾼다', () => {
    expect(
      dragView(INITIAL_VIEW, { x: 30, y: -40 }, { width: 300, height: 400 }),
    ).toEqual({ zoom: 1, offsetX: 0.1, offsetY: -0.1 });
  });
});

describe('formatPercent', () => {
  it('확대는 그대로, 위치는 부호를 붙인다', () => {
    expect(formatPercent(1.2)).toBe('120%');
    expect(formatPercent(0.12, true)).toBe('+12%');
    expect(formatPercent(-0.08, true)).toBe('-8%');
    expect(formatPercent(0, true)).toBe('0%');
  });
});
