import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseEnv } from './env';

type SessionResult = {
  response: NextResponse;
  isSignedIn: boolean;
};

// proxy.ts에서 요청마다 부른다. 만료가 가까운 세션을 새로 받아 쿠키에 다시 저장하고,
// 로그인했는지 알려 준다. 서버 컴포넌트는 쿠키를 쓸 수 없어서 갱신은 여기서만 할 수 있다
export async function updateSession(
  request: NextRequest,
): Promise<SessionResult> {
  const { url, publishableKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // 요청 쪽에도 넣어야 이번 요청에서 그려지는 서버 컴포넌트가 새 세션을 읽는다
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        // 응답 쪽에 넣어야 브라우저가 새 세션을 저장한다
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // 세션이 담긴 응답이 CDN에 캐시되어 다른 사람에게 가지 않도록 Supabase가 주는 캐시 헤더
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // getSession은 쿠키 내용을 그대로 믿어서 조작될 수 있다. getClaims는 토큰의 서명을 검증한다
  const { data } = await supabase.auth.getClaims();

  return { response, isSignedIn: Boolean(data?.claims) };
}

// 다른 주소로 보낼 때도 updateSession이 갱신한 세션 쿠키를 함께 실어 보낸다.
// 빠뜨리면 갱신된 세션이 버려져서 다음 요청에서 로그아웃된 것처럼 보일 수 있다
export function redirectWithSession(
  request: NextRequest,
  sessionResponse: NextResponse,
  path: string,
): NextResponse {
  const redirectResponse = NextResponse.redirect(new URL(path, request.url));
  sessionResponse.cookies
    .getAll()
    .forEach((cookie) => redirectResponse.cookies.set(cookie));
  return redirectResponse;
}
