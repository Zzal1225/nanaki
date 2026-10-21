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

// 계정 삭제 결과. 화면은 결과마다 다른 안내를 보여 준다
export type DeleteAccountResult = 'deleted' | 'unavailable' | 'failed';

const DELETED_STATUS = 204;
const UNAVAILABLE_STATUS = 503;

// 내 계정 지우기. 실제 삭제는 서버(app/api/account)가 secret 키로 한다 (브라우저 키로는 사용자를 지울 수 없다).
// 성공은 204일 때만: 다른 응답(로그인 화면으로 돌려보낸 HTML 등)을 성공으로 착각하지 않게
export async function deleteAccount(): Promise<DeleteAccountResult> {
  let response: Response;
  try {
    response = await fetch('/api/account', { method: 'DELETE' });
  } catch {
    return 'failed';
  }

  if (response.status === UNAVAILABLE_STATUS) return 'unavailable';
  if (response.status !== DELETED_STATUS) return 'failed';

  // 서버도 쿠키를 지웠지만, 브라우저에 남은 세션도 지운다. 사용자는 이미 없어서 Supabase에 보내는
  // 로그아웃 요청은 실패할 수 있는데, supabase-js는 그때도 이 브라우저의 세션은 지운다
  await signOut();
  return 'deleted';
}
