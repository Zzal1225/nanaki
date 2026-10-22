import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { openLocalDb, type LocalDb } from './localDb';

// 지금 로그인한 계정의 기기 사본. 계정은 getSession으로 안다:
// 쿠키에 저장된 세션을 읽기만 해서 오프라인에서도 된다 (getUser는 서버에 물어봐서 오프라인이면 실패한다)
export async function currentLocalDb(): Promise<LocalDb> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const userId = data.session?.user.id;
  // 로그인 뒤 화면에서만 부른다 (proxy가 막는다). 여기까지 왔는데 세션이 없으면 사본을 고를 수 없다
  if (!userId) throw new Error('로그인 세션이 없어 기기 사본을 열 수 없음');
  return openLocalDb(userId);
}

// 동기화 실패는 화면을 멈추지 않는다: 사본에 있는 것으로 그린다 (오프라인이 대표적인 경우).
// 온라인인데 실패했으면 원인을 알 수 있게 남긴다. 오프라인 실패는 당연한 일이라 남기지 않는다
export function warnSyncFailure(table: string, error: unknown): void {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  console.warn(`[sync] ${table} 동기화 실패, 기기 사본으로 보여 줌`, error);
}
