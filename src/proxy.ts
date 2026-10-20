import type { NextRequest } from 'next/server';
import { getAuthRedirectPath } from '@/features/auth/getAuthRedirectPath';
import { redirectWithSession, updateSession } from '@/lib/supabase/proxy';

// 모든 페이지보다 먼저 실행된다. 세션을 갱신하고, 로그인 상태에 맞지 않는 주소면 돌려보낸다
export async function proxy(request: NextRequest) {
  const { response, isSignedIn } = await updateSession(request);
  const redirectPath = getAuthRedirectPath(
    request.nextUrl.pathname,
    isSignedIn,
  );
  if (redirectPath === null) {
    return response;
  } else {
    return redirectWithSession(request, response, redirectPath);
  }
}

// 이미지·글꼴·Next 내부 파일까지 문지기를 거치면 느려지고, 로그인 화면의 CSS까지 막힐 수 있어서 뺀다
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)',
  ],
};
