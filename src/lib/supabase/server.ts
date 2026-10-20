import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseEnv } from './env';

// 서버(서버 컴포넌트, Route Handler)에서 쓰는 Supabase. 요청에 담긴 쿠키로 로그인한 사람을 알아낸다.
// 요청마다 쿠키가 다르므로 모듈에 하나를 만들어 두지 않고 부를 때마다 새로 만든다
export async function createSupabaseServerClient() {
  const { url, publishableKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없어서 예외가 난다. 만료된 세션의 갱신은
          // 다음 단계의 proxy.ts가 요청마다 맡으므로 여기서는 무시해도 된다
        }
      },
    },
  });
}
