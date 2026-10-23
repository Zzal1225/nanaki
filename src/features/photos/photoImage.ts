// 사진을 올리기 전에 기기에서 다듬는다 (step4 37a, CLAUDE.md 몸 사진 규칙):
// 1) EXIF 회전 바로잡기: 휴대폰 사진은 "옆으로 누운 그림 + 돌려 보라는 표시(EXIF)"로 저장되는 경우가 많다.
//    createImageBitmap(..., { imageOrientation: 'from-image' })가 표시대로 돌린 그림을 준다
// 2) 다시 인코딩: 캔버스에 그려 새 파일로 만들면 EXIF(촬영 위치 GPS 포함)가 따라오지 않는다
// 3) 크기 줄이기: 긴 변 1600px(보기용) + 400px(썸네일), WebP (못 만드는 브라우저는 JPEG)
// 판단(형식·크기 계산)은 순수 함수로 두고 테스트한다. 캔버스는 jsdom에 없어 실제 변환은 브라우저 확인으로

export const MAIN_MAX_PIXELS = 1600;
export const THUMB_MAX_PIXELS = 400;
// WebP 0.8: 눈으로 차이가 거의 없고 원본(수 MB)보다 크게 작다. JPEG도 같은 값
const ENCODE_QUALITY = 0.8;

// 받는 형식 (CLAUDE.md: JPG·PNG·WebP만). HEIC(아이폰 기본 저장 형식)는 브라우저가 대부분 못 읽어 안내만 한다.
// 변환 라이브러리는 용량이 커서 별도 승인 (CLAUDE.md)
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_ACCEPT = ACCEPTED_TYPES.join(',');

export type PhotoFileCheck = 'ok' | 'heic' | 'unsupported';

// 파일 형식 확인. HEIC는 type이 비어 오는 브라우저가 있어 확장자도 본다
export function checkPhotoFile(file: {
  type: string;
  name: string;
}): PhotoFileCheck {
  const name = file.name.toLowerCase();
  if (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  ) {
    return 'heic';
  }
  return ACCEPTED_TYPES.includes(file.type) ? 'ok' : 'unsupported';
}

export const PHOTO_FILE_MESSAGE: Record<
  Exclude<PhotoFileCheck, 'ok'>,
  string
> = {
  heic: 'HEIC 사진은 올릴 수 없어요. 아이폰 설정 > 카메라 > 포맷에서 "높은 호환성"을 고르거나 JPG로 저장해 주세요',
  unsupported: 'JPG, PNG, WebP 사진만 올릴 수 있어요',
};

// 비율을 지키며 긴 변을 max 안으로 (작은 사진은 키우지 않는다)
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export type CompressedPhoto = {
  main: Blob;
  thumb: Blob;
  width: number;
  height: number;
  // 'image/webp' 또는 'image/jpeg' (WebP를 못 만드는 브라우저)
  type: string;
};

function encode(
  bitmap: ImageBitmap,
  size: { width: number; height: number },
  type: string,
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) return Promise.resolve(null);
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  return new Promise((resolve) => canvas.toBlob(resolve, type, ENCODE_QUALITY));
}

// 브라우저에서만. 실패하면(읽을 수 없는 그림) 던진다
export async function compressPhoto(file: Blob): Promise<CompressedPhoto> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  });
  try {
    const mainSize = fitWithin(bitmap.width, bitmap.height, MAIN_MAX_PIXELS);
    const thumbSize = fitWithin(bitmap.width, bitmap.height, THUMB_MAX_PIXELS);
    let main = await encode(bitmap, mainSize, 'image/webp');
    // WebP를 못 만드는 브라우저는 toBlob이 PNG로 돌려준다 (요청한 형식을 무시) → JPEG로 다시
    const type = main?.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
    if (type === 'image/jpeg') main = await encode(bitmap, mainSize, type);
    const thumb = await encode(bitmap, thumbSize, type);
    if (!main || !thumb) throw new Error('사진을 바꾸지 못함');
    return { main, thumb, type, ...mainSize };
  } finally {
    bitmap.close();
  }
}
