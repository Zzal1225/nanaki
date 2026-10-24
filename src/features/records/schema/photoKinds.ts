// 기록에 붙는 사진의 종류 (step4). 타입 설정(recordTypes.photoKinds)이 어느 타입에 무슨 사진 칸이 있는지 정한다:
// 화면은 이 설정만 보고 칸을 그려, 컴포넌트에 if (type === 'body')가 없다 (CLAUDE.md)
// DB photos.kind check와 같은 값

export type PhotoKind = 'front' | 'side' | 'review';

export const PHOTO_KIND_LABEL: Record<PhotoKind, string> = {
  front: '정면',
  side: '측면',
  review: '사진',
};

// 종류마다 한 기록에 붙는 최대 장수. 1장(정면·측면)은 "칸"으로, 여러 장(후기, 시안 5: 최대 5장)은 "갤러리"로 그린다.
// 갤러리 사진은 원본 비율 그대로 (2026-10-24 사용자 결정: 음식·장소 사진은 가로가 많아 3:4로 자르면 답답하다) → 자르기·앱 안 카메라를 거치지 않는다.
// 5장은 화면에서만 막는다 (서버 규칙 없음: 사진 줄은 본인 기록에만 붙고 크기 제한이 있어 넘쳐도 피해가 작다)
export const PHOTO_KIND_MAX: Record<PhotoKind, number> = {
  front: 1,
  side: 1,
  review: 5,
};

export function isGalleryKind(kind: PhotoKind): boolean {
  return PHOTO_KIND_MAX[kind] > 1;
}
