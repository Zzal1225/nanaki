// 작성·수정 화면인지 (/records/new, /records/<id>/edit, /routines/new, /routines/<id>/edit).
// 이 화면에서는 하단 탭과 스피드 다이얼을 숨긴다 (CLAUDE.md: 입력 중 하단 탭·스피드 다이얼 숨김,
// 2026-10-22 사용자 결정: 작성 화면에는 하단 탭이 없는 게 자연스럽다).
// 주소 끝으로 판단한다: 새 작성 화면이 생겨도 /new·/edit 규칙만 지키면 따로 등록하지 않아도 된다
const FORM_PATH_PATTERN = /\/(new|edit)$/;

export function isFormPath(pathname: string): boolean {
  return FORM_PATH_PATTERN.test(pathname);
}
