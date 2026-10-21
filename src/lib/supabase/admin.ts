import { createClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './env';

// 관리자 권한 Supabase. secret 키는 RLS를 무시하고 모든 계정·데이터를 다룰 수 있어서 서버에서만 만든다.
// 지금은 계정 삭제(app/api/account) 한 곳에서만 쓴다. 다른 곳에서 필요해지면 정말 RLS를 넘어야 하는지 먼저 따진다
export function createSupabaseAdminClient(secretKey: string) {
  // server-only 패키지 대신 직접 막는다 (기술 스택 밖이라 추가하지 않음).
  // 실수로 클라이언트 컴포넌트에서 부르면 바로 알 수 있게
  if (typeof window !== 'undefined') {
    throw new Error(
      '관리자 Supabase 클라이언트는 서버에서만 만들 수 있습니다.',
    );
  }

  const { url } = getSupabaseEnv();
  return createClient(url, secretKey, {
    // 요청 하나에만 쓰고 버린다. 세션을 저장하거나 갱신하면 서버 메모리에 관리자 세션이 남는다
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
