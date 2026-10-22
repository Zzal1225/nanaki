import { isFormPath } from '@/shared/layout/isFormPath';
import { SETTINGS_ITEM } from '@/shared/layout/navItems';

// 모바일 스피드 다이얼(+)을 보여 줄 화면인지. 스피드 다이얼은 "작성 전용"(CLAUDE.md)이라
// - 작성·수정 중에는 숨긴다: 폼 위에 또 작성 버튼이 뜨고, 입력 중 화면을 가린다 (CLAUDE.md: 입력 중 숨김).
//   하단 탭과 같은 규칙(isFormPath)을 쓴다 → 루틴 만들기(/routines/new)에서도 숨는다 (예전에는 빠져 있었다)
// - 설정에서는 숨긴다: 기록을 보거나 쓰는 화면이 아니다 (시안 8a에도 없음, Issue #47)
export function shouldShowSpeedDial(pathname: string): boolean {
  if (isFormPath(pathname)) return false;
  if (pathname.startsWith(SETTINGS_ITEM.href)) return false;
  return true;
}
