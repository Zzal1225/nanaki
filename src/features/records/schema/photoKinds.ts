// 기록에 붙는 사진의 종류 (step4). 타입 설정(recordTypes.photoKinds)이 어느 타입에 무슨 사진 칸이 있는지 정한다:
// 화면은 이 설정만 보고 칸을 그려, 컴포넌트에 if (type === 'body')가 없다 (CLAUDE.md)
// DB photos.kind check와 같은 값

export type PhotoKind = 'front' | 'side' | 'review';

export const PHOTO_KIND_LABEL: Record<PhotoKind, string> = {
  front: '정면',
  side: '측면',
  review: '사진',
};
