const HOME_HREF = '/';

// 지금 주소(pathname)에서 메뉴(href)가 선택된 상태로 보여야 하는지
export function isActivePath(pathname: string, href: string): boolean {
  // 모든 주소가 '/'로 시작하므로 홈만은 정확히 같을 때만 선택한다
  if (href === HOME_HREF) {
    return pathname === '/';
  }

  // 상세 화면(/records/abc)에서도 선택하되, 이름만 비슷한 주소(/recordsx)는 빼려고 뒤에 '/'를 붙여 본다
  return pathname === href || pathname.startsWith(`${href}/`);
}
