import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database, TablesInsert } from '@/lib/supabase/database.types';

// 통합 테스트가 붙는 Supabase. CI가 `supabase start` 뒤 `supabase status`에서 값을 꺼내 넣는다 (ci.yml).
// 실제 서비스 프로젝트 주소·키는 절대 넣지 않는다: 테스트가 사용자를 만들고 지운다
const URL = process.env.SUPABASE_TEST_URL;
const ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_TEST_SERVICE_KEY;

// 값이 없으면(Docker 없는 내 컴퓨터) 테스트 묶음을 건너뛴다. 실패가 아니라 "여기서는 못 돌림"이다
export const hasTestSupabase = Boolean(URL && ANON_KEY && SERVICE_KEY);

// CI에서는 반드시 돌아야 한다. 값을 꺼내는 단계가 틀려 비어 있으면, 건너뛴 테스트가 초록불로 보여
// RLS가 깨져도 모르고 지나간다. 그래서 CI(GitHub Actions가 CI=true를 넣는다)에서는 건너뛰지 않고 실패시킨다
if (process.env.CI && !hasTestSupabase) {
  throw new Error(
    'CI인데 SUPABASE_TEST_URL / ANON_KEY / SERVICE_KEY가 비어 있습니다. ci.yml의 supabase status 단계를 확인하세요.',
  );
}

export type TestClient = SupabaseClient<Database>;

// 테스트마다 따로 쓰는 클라이언트. 세션을 저장하지 않아 사용자끼리 섞이지 않는다
function createTestClient(key: string): TestClient {
  return createClient<Database>(URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// 로그인하지 않은 사람 (anon 역할)
export function createSignedOutClient(): TestClient {
  return createTestClient(ANON_KEY!);
}

// RLS를 무시하는 관리자. 준비·확인·정리에만 쓰고, 검사 대상(사용자 쪽 요청)에는 쓰지 않는다
export function createAdminClient(): TestClient {
  return createTestClient(SERVICE_KEY!);
}

export type TestGuest = { client: TestClient; userId: string };

// "로그인 없이 체험하기"와 같은 방법으로 새 사용자를 만든다. 이메일·비밀번호 없이 둘을 쉽게 만들 수 있다
export async function signInAsNewGuest(): Promise<TestGuest> {
  const client = createTestClient(ANON_KEY!);
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw error ?? new Error('익명 로그인 실패');
  return { client, userId: data.user.id };
}

// 테스트가 만든 사용자 정리. 기록·설정은 on delete cascade로 함께 지워진다
export async function deleteGuests(...guests: TestGuest[]): Promise<void> {
  const admin = createAdminClient();
  await Promise.all(
    guests.map((guest) => admin.auth.admin.deleteUser(guest.userId)),
  );
}

// 기록 한 줄 (DB 칸 이름 그대로). 앱의 스키마 검사는 이 테스트의 대상이 아니라 DB 규칙만 본다
// id는 늘 채워서 돌려준다 (자동 생성 타입에서는 선택 칸이라, 테스트가 그 id로 다시 찾을 수 있게 좁힌다)
export function newRecordRow(
  title: string,
): TablesInsert<'records'> & { id: string } {
  return {
    id: crypto.randomUUID(),
    type: 'expense',
    occurred_at: '2026-10-21',
    title,
    memo: null,
    tags: [],
    fields: { amount: 1000, category: '식비' },
  };
}
