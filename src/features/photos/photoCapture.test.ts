import { describe, expect, it } from 'vitest';
import {
  cameraErrorMessage,
  canUseInAppCamera,
  captureSourceRect,
  nextTimer,
} from './photoCapture';

describe('canUseInAppCamera (기기 능력으로)', () => {
  it('카메라 API가 있고 손가락으로 쓰는 기기만', () => {
    expect(
      canUseInAppCamera({ hasGetUserMedia: true, isCoarsePointer: true }),
    ).toBe(true);
    // PC 웹캠: 불러오기 + 맞춰 자르기
    expect(
      canUseInAppCamera({ hasGetUserMedia: true, isCoarsePointer: false }),
    ).toBe(false);
    // http 주소·오래된 브라우저 (mediaDevices 없음)
    expect(
      canUseInAppCamera({ hasGetUserMedia: false, isCoarsePointer: true }),
    ).toBe(false);
  });
});

describe('nextTimer', () => {
  it('끔 → 3초 → 10초 → 끔', () => {
    expect(nextTimer(0)).toBe(3);
    expect(nextTimer(3)).toBe(10);
    expect(nextTimer(10)).toBe(0);
  });
});

describe('captureSourceRect (화면의 틀 → 영상 픽셀)', () => {
  // 세로 영상 1080×1440(3:4)을 375×812 화면에 꽉 채움: 높이를 맞춰 812/1440배, 가로는 양쪽이 잘림
  const video = { width: 1080, height: 1440 };
  const box = { x: 0, y: 0, width: 375, height: 812 };
  const scale = 812 / 1440;
  const hiddenLeft = (1080 * scale - 375) / 2;
  // 화면 가운데 375×500 틀
  const frame = { x: 0, y: 156, width: 375, height: 500 };

  it('object-cover로 잘린 만큼을 되돌려 틀 자리를 찾는다', () => {
    const rect = captureSourceRect({ video, box, frame });
    expect(rect.x).toBeCloseTo(hiddenLeft / scale);
    expect(rect.y).toBeCloseTo(156 / scale);
    expect(rect.width).toBeCloseTo(375 / scale);
    expect(rect.height).toBeCloseTo(500 / scale);
    // 3:4 틀은 영상에서도 3:4
    expect(rect.width / rect.height).toBeCloseTo(3 / 4);
  });

  it('영상 요소가 화면 왼쪽 위에 붙어 있지 않아도 (box 위치를 뺀다)', () => {
    const shifted = captureSourceRect({
      video,
      box: { ...box, y: 20 },
      frame: { ...frame, y: 176 },
    });
    expect(shifted.y).toBeCloseTo(156 / scale);
  });
});

describe('cameraErrorMessage', () => {
  it('권한 거절은 설정 안내, 카메라 없음은 갤러리 안내', () => {
    expect(
      cameraErrorMessage(new DOMException('', 'NotAllowedError')),
    ).toContain('권한');
    expect(cameraErrorMessage(new DOMException('', 'NotFoundError'))).toBe(
      '쓸 수 있는 카메라가 없어요. 갤러리에서 불러와 주세요',
    );
    expect(cameraErrorMessage(new Error('x'))).toBe(
      '카메라를 열지 못했어요. 갤러리에서 불러와 주세요',
    );
  });
});
