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
      // 로그인할 때마다 구글 계정 선택 화면을 띄운다. 앱에서 로그아웃해도 브라우저의 구글 로그인은 남아 있어서,
      // 이 옵션이 없으면 다음에 누른 사람이 앞 사람 계정으로 바로 들어간다 (같이 쓰는 PC, 계정이 여러 개인 사람).
      // 'consent'가 아니라 'select_account'라 정보 제공 동의는 다시 묻지 않는다
      queryParams: { prompt: 'select_account' },
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
