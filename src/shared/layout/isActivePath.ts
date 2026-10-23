const HOME_HREF = '/';

// 기록 탭 밖 주소지만 기록 탭에 속한 화면. 예산(/budget)·고정지출(/fixed-expenses)은 가계부 화면에서 들어가는 화면이라 기록 탭을 켠 채 둔다.
// 주소를 /records 아래로 두지 않은 이유: 기록 layout(PC 목록 + 오른쪽 패널) 밖에서 넓게 보이게 (33b)
const MENU_EXTRA_PATHS: Readonly<Record<string, readonly string[]>> = {
  '/records': ['/budget', '/fixed-expenses'],
};

function isUnder(pathname: string, href: string): boolean {
  // 상세 화면(/records/abc)에서도 선택하되, 이름만 비슷한 주소(/recordsx)는 빼려고 뒤에 '/'를 붙여 본다
  return pathname === href || pathname.startsWith(`${href}/`);
}

// 지금 주소(pathname)에서 메뉴(href)가 선택된 상태로 보여야 하는지
export function isActivePath(pathname: string, href: string): boolean {
  // 모든 주소가 '/'로 시작하므로 홈만은 정확히 같을 때만 선택한다
  if (href === HOME_HREF) {
    return pathname === '/';
  }
  const extraPaths = MENU_EXTRA_PATHS[href] ?? [];
  return (
    isUnder(pathname, href) ||
    extraPaths.some((extra) => isUnder(pathname, extra))
  );
}
