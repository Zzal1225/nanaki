import { SETTINGS_ITEM } from '@/shared/layout/navItems';

const NEW_RECORD_PATH = '/records/new';
const EDIT_PATH_SUFFIX = '/edit';

// 모바일 스피드 다이얼(+)을 보여 줄 화면인지. 스피드 다이얼은 "작성 전용"(CLAUDE.md)이라
// - 작성·수정 중에는 숨긴다: 폼 위에 또 작성 버튼이 뜨고, 입력 중 화면을 가린다 (CLAUDE.md: 입력 중 숨김)
// - 설정에서는 숨긴다: 기록을 보거나 쓰는 화면이 아니다 (시안 8a에도 없음, Issue #47)
export function shouldShowSpeedDial(pathname: string): boolean {
  if (pathname.startsWith(NEW_RECORD_PATH)) return false;
  if (pathname.endsWith(EDIT_PATH_SUFFIX)) return false;
  if (pathname.startsWith(SETTINGS_ITEM.href)) return false;
  return true;
}
