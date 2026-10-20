import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseEnv } from './env';

// 브라우저(클라이언트 컴포넌트)에서 쓰는 Supabase. 로그인 버튼처럼 사용자가 누르는 동작에서 부른다.
// 세션은 쿠키에 저장되어서 서버에서도 같은 로그인 상태를 읽을 수 있다
export function createSupabaseBrowserClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient(url, publishableKey);
}
