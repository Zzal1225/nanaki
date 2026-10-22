'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// 주소를 보고 "이 화면이 아니다"라고 판단했을 때 다른 주소로 옮긴다 (모르는 타입 → 홈 등). target이 null이면 그대로.
//
// next/navigation의 redirect()를 그리는 중에 부르면 안 된다 (2026-10-22 아이폰 확인에서 찾음):
// cacheComponents에서는 떠난 화면을 지우지 않고 숨겨 둔다(React Activity). 숨은 화면도 주소가 바뀌면 다시 그려지는데,
// 이때 useSearchParams·usePathname은 "지금 주소"(예: 홈 /)를 돌려준다 → 작성 화면이 type이 없다고 보고 redirect('/')를 던진다.
// 그 리다이렉트가 숨은 화면에 남아 있다가, 다음에 작성 화면을 열면(다시 보일 때) 실행되어 곧바로 홈으로 되돌아갔다.
// effect는 숨은 화면에서 실행되지 않고, 다시 보일 때는 그 화면의 주소로 그린 뒤 실행되므로 이 문제가 없다
export function useReplaceRoute(target: string | null): void {
  const router = useRouter();
  useEffect(() => {
    // replace: 뒤로 가기로 잘못된 주소에 돌아와 또 옮겨지는 일이 없게
    if (target) router.replace(target);
  }, [router, target]);
}
