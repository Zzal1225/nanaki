import type { AuthError } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

// 성공하면 브라우저가 구글 로그인 화면으로 떠나므로, 이 함수가 돌려주는 건 실패했을 때의 error뿐이다
export async function signInWithGoogle(): Promise<AuthError | null> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // 로컬·배포·PR 미리보기마다 주소가 달라서 현재 주소를 쓴다.
      // Supabase의 Redirect URLs에 등록된 주소만 허용된다
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return error;
}

// "로그인 없이 체험하기": 이름 없는 계정을 만들어 바로 로그인한다
export async function signInAsGuest(): Promise<AuthError | null> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signInAnonymously();

  return error;
}

// 로그아웃. 세션 쿠키를 지운다. 화면 이동과 메모리 정리는 부르는 쪽(LogoutButton)이 맡는다
export async function signOut(): Promise<AuthError | null> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();

  return error;
}
