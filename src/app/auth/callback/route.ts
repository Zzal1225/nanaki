import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const HOME_PATH = '/';
const LOGIN_PATH = '/login';

// 구글 로그인 뒤 Supabase가 ?code=...를 붙여 이 주소로 돌려보낸다.
// 세션을 쿠키에 저장해야 이후 요청에서 서버가 로그인한 사람을 알 수 있어서, 교환은 서버에서 한다
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  // 사용자가 구글 화면에서 취소했거나 이 주소를 직접 열면 code가 없다
  if (!code) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  return NextResponse.redirect(new URL(HOME_PATH, request.url));
}
