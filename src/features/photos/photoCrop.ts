// 맞춰 자르기 계산 (step4 37c1). 화면 미리보기(CSS %)와 저장 결과(캔버스)가 같은 함수로 배치를 구해서,
// "보이는 대로 잘린다"가 어긋나지 않는다. 계산은 순수 함수로 두고 테스트한다 (캔버스는 jsdom에 없다)

// 결과 틀: 세로 3:4. 썸네일 칸(aspect-[3/4])·비교 슬라이더(37d)와 같은 비율이라 사진끼리 겹쳐 비교할 수 있다
export const CROP_ASPECT = 3 / 4;
// 결과 크기 (긴 변 = 올리기의 보기용 최대 1600px과 같게: 압축 단계에서 다시 줄이지 않는다)
export const CROP_OUTPUT = { width: 1200, height: 1600 } as const;

// 확대: 1 = 틀을 꽉 채움(cover). 1보다 작게도 허용한다: 멀리서 찍은 사진은 그대로, 가까이서 찍은 사진은 줄여야
// 실루엣·지난 사진과 몸 크기가 맞는다. 빈 곳은 검게 채운다
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.05;
// 위치: 틀 크기 대비 사진 중심을 옮긴 비율 (−0.5 ~ 0.5 = 틀 절반까지)
export const OFFSET_MAX = 0.5;
export const OFFSET_STEP = 0.01;
// 지난 사진 겹치기 기본값 (시안: 35%). 몸 윤곽은 보이고 지금 사진을 가리지 않는 정도
export const OVERLAY_DEFAULT = 0.35;

export type CropView = { zoom: number; offsetX: number; offsetY: number };

export const INITIAL_VIEW: CropView = { zoom: 1, offsetX: 0, offsetY: 0 };

// 틀 안에서 사진이 놓일 자리 (틀 크기 대비 비율). left·top이 음수면 틀 밖으로 나간 부분이다
export type CropLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function layoutCrop(
  image: { width: number; height: number },
  view: CropView,
): CropLayout {
  const imageAspect = image.width / image.height;
  // cover: 틀보다 넓은 사진은 높이를 맞추고 가로가 넘친다, 좁은 사진은 그 반대
  const base =
    imageAspect > CROP_ASPECT
      ? { width: imageAspect / CROP_ASPECT, height: 1 }
      : { width: 1, height: CROP_ASPECT / imageAspect };
  const width = base.width * view.zoom;
  const height = base.height * view.zoom;
  return {
    left: 0.5 + view.offsetX - width / 2,
    top: 0.5 + view.offsetY - height / 2,
    width,
    height,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// 소수 오차 정리: 0.1 + 0.2 같은 값이 화면 숫자("+30%")를 흔들지 않게 단계 단위로 맞춘다.
// "× step"이 아니라 "÷ (1/step)": 115 × 0.01은 1.1500000000000001이지만 115 ÷ 100은 1.15다 (0.01은 2진수로 정확히 못 적는다)
function roundTo(value: number, step: number): number {
  return Math.round(value / step) / Math.round(1 / step);
}

export function clampView(view: CropView): CropView {
  return {
    zoom: clamp(roundTo(view.zoom, 0.01), ZOOM_MIN, ZOOM_MAX),
    offsetX: clamp(roundTo(view.offsetX, 0.001), -OFFSET_MAX, OFFSET_MAX),
    offsetY: clamp(roundTo(view.offsetY, 0.001), -OFFSET_MAX, OFFSET_MAX),
  };
}

// 끌어 옮기기: 화면에서 움직인 px를 틀 크기로 나눠 위치에 더한다 (틀이 커도 작아도 손가락을 따라 움직인다)
export function dragView(
  view: CropView,
  delta: { x: number; y: number },
  frame: { width: number; height: number },
): CropView {
  return clampView({
    ...view,
    offsetX: view.offsetX + delta.x / frame.width,
    offsetY: view.offsetY + delta.y / frame.height,
  });
}

// 화면 숫자: 확대 "120%", 위치 "+12%"
export function formatPercent(value: number, isSigned = false): string {
  const percent = Math.round(value * 100);
  const sign = isSigned && percent > 0 ? '+' : '';
  return `${sign}${percent}%`;
}

// 저장 결과 만들기 (브라우저에서만). 회전 표시(EXIF)대로 돌린 그림을 틀에 그려 JPEG로.
// JPEG 0.92로 한 번 만들고 올리기 단계(compressPhoto)가 WebP로 다시 인코딩한다: 두 번 인코딩하지만
// 올리기 경로를 하나로 두는 쪽을 골랐다 (자르기 없는 경로·후기 사진과 같은 함수를 지난다). 화질 손실은 눈으로 구분이 어려운 정도
const OUTPUT_QUALITY = 0.92;
// 틀 밖 빈 곳(확대 < 1). 사진 비교에서 눈에 덜 띄는 무채색
const EMPTY_FILL = '#000000';

export async function readImageSize(
  file: Blob,
): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  });
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

export async function renderCroppedPhoto(
  file: Blob,
  view: CropView,
  name: string,
): Promise<File> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  });
  try {
    const canvas = document.createElement('canvas');
    canvas.width = CROP_OUTPUT.width;
    canvas.height = CROP_OUTPUT.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('캔버스를 만들지 못함');
    context.fillStyle = EMPTY_FILL;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const layout = layoutCrop(bitmap, view);
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      bitmap,
      layout.left * canvas.width,
      layout.top * canvas.height,
      layout.width * canvas.width,
      layout.height * canvas.height,
    );
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', OUTPUT_QUALITY),
    );
    if (!blob) throw new Error('사진을 만들지 못함');
    return new File([blob], name, { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}
