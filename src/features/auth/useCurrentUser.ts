import { useQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export type CurrentUser = {
  // 구글 계정 이메일. 체험(익명) 계정은 null
  email: string | null;
  // "로그인 없이 체험하기"로 만든 계정. 로그아웃하면 다시 들어올 방법이 없다
  isAnonymous: boolean;
};

// 화면에 "누구로 로그인했는지" 보여 주는 용도. getUser(서버에 확인) 대신 getSession(브라우저에 저장된 세션)을 읽는다:
// 보여 주기만 하는 값이라 요청을 아끼고, 권한 판단은 어차피 서버(proxy)와 DB(RLS)가 한다
async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  return { email: user.email ?? null, isAnonymous: user.is_anonymous ?? false };
}

export function useCurrentUser() {
  return useQuery({ queryKey: ['auth', 'user'], queryFn: getCurrentUser });
}
