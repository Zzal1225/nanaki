import { CROP_OUTPUT } from './photoCrop';

// 앱 안 카메라 촬영 계산 (step4 37c2). 화면에 보이는 3:4 틀 안을 그대로 사진으로 만든다:
// 영상은 화면을 꽉 채우게(object-cover) 늘려 보여 주므로, 틀의 화면 좌표를 영상 픽셀 좌표로 되돌려야 한다.
// 판단·계산은 순수 함수로 두고 테스트한다 (카메라·캔버스는 jsdom에 없다)

// 앱 안 카메라를 보여 줄 기기인지 (CLAUDE.md: 화면 너비가 아니라 기기 능력으로).
// 카메라 API가 있고 손가락으로 쓰는 기기(pointer: coarse)만: 노트북 웹캠으로 전신을 찍는 일은 드물어 PC는 불러오기 + 맞춰 자르기
export function canUseInAppCamera(device: {
  hasGetUserMedia: boolean;
  isCoarsePointer: boolean;
}): boolean {
  return device.hasGetUserMedia && device.isCoarsePointer;
}

// 타이머: 끔 → 3초 → 10초 → 끔 (2026-10-23 사용자 결정). 휴대폰을 세워 두고 혼자 전신을 찍으려면 필요하다
export const TIMER_SECONDS = [0, 3, 10] as const;
export type TimerSeconds = (typeof TIMER_SECONDS)[number];

export function nextTimer(current: TimerSeconds): TimerSeconds {
  const index = TIMER_SECONDS.indexOf(current);
  return TIMER_SECONDS[(index + 1) % TIMER_SECONDS.length] ?? 0;
}

type Rect = { x: number; y: number; width: number; height: number };

// 화면의 틀(frame) → 영상 픽셀에서 잘라 낼 자리.
// - video: 영상 원래 크기(videoWidth·videoHeight), box: 영상 요소가 화면에 차지한 자리(object-cover로 꽉 채움)
// - isMirrored: 전면 카메라는 거울처럼 뒤집어 보여 준다. 저장은 뒤집지 않은 실제 모습이라, 잘라 낼 자리를 좌우로 되돌린다
//   (보이는 화면의 왼쪽 = 영상의 오른쪽)
export function captureSourceRect(input: {
  video: { width: number; height: number };
  box: Rect;
  frame: Rect;
  isMirrored: boolean;
}): Rect {
  const { video, box, frame } = input;
  // object-cover: 영상을 요소보다 크게 늘려 짧은 쪽을 맞추고, 남는 쪽은 가운데 기준으로 잘려 안 보인다
  const scale = Math.max(box.width / video.width, box.height / video.height);
  const shownWidth = video.width * scale;
  const shownHeight = video.height * scale;
  const hiddenLeft = (shownWidth - box.width) / 2;
  const hiddenTop = (shownHeight - box.height) / 2;

  const width = frame.width / scale;
  const height = frame.height / scale;
  const left = (frame.x - box.x + hiddenLeft) / scale;
  const top = (frame.y - box.y + hiddenTop) / scale;
  return {
    x: input.isMirrored ? video.width - left - width : left,
    y: top,
    width,
    height,
  };
}

// 찍은 사진 만들기 (브라우저에서만): 영상의 지금 한 장에서 틀 자리를 잘라 1200×1600 JPEG로.
// 자르기(37c1)와 같은 크기·형식이라 올리기 경로가 같다. 카메라 영상에는 EXIF가 없어 회전·위치 정보 걱정이 없다
const OUTPUT_QUALITY = 0.92;

export async function captureVideoFrame(
  video: HTMLVideoElement,
  source: Rect,
  name: string,
): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = CROP_OUTPUT.width;
  canvas.height = CROP_OUTPUT.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('캔버스를 만들지 못함');
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    video,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', OUTPUT_QUALITY),
  );
  if (!blob) throw new Error('사진을 만들지 못함');
  return new File([blob], name, { type: 'image/jpeg' });
}

// 카메라를 못 연 이유 → 안내 문구. 권한 거절이 가장 흔하고, 사용자가 고칠 수 있는 곳(설정)을 알려 준다
export function cameraErrorMessage(error: unknown): string {
  const name = (error as { name?: unknown } | null)?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return '카메라 권한이 꺼져 있어요. 설정에서 허용하거나 갤러리에서 불러와 주세요';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return '쓸 수 있는 카메라가 없어요. 갤러리에서 불러와 주세요';
  }
  return '카메라를 열지 못했어요. 갤러리에서 불러와 주세요';
}
