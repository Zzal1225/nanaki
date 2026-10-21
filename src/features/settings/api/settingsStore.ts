import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert } from '@/lib/supabase/database.types';

// 설정 저장·조회의 유일한 입구 (기록의 recordStore와 같은 규칙: 훅·컴포넌트는 Supabase를 직접 부르지 않는다).
// "내 설정만" 조건은 쓰지 않는다. RLS가 auth.uid() = user_id를 붙인다

export type UserSettings = {
  // 숨긴 타입 이름. 앱이 아직 모르는 타입 이름이 섞여 있을 수 있어 string[] (typeVisibility.ts 참고)
  hiddenTypes: string[];
};

// 설정 줄이 아직 없는 사람(처음 로그인) = 모든 타입이 켜진 상태 (CLAUDE.md: 첫 실행 시 모두 켜짐).
// 처음 들어올 때 빈 줄을 미리 만들지 않고, 처음 바꿀 때 만든다 (upsert)
const DEFAULT_SETTINGS: UserSettings = { hiddenTypes: [] };

// DB 줄 모양은 자동 생성 타입에서 가져온다. 이 Supabase 클라이언트에는 DB 타입이 연결돼 있지 않아
// 조회 결과가 타입 검사를 받지 않으므로, 받는 자리에서 줄 타입을 붙여 둔다
type SettingsRow = Pick<Tables<'user_settings'>, 'hidden_types'>;
type SettingsInsert = TablesInsert<'user_settings'>;

function toUserSettings(row: SettingsRow): UserSettings {
  return { hiddenTypes: row.hidden_types };
}

export async function getUserSettings(): Promise<UserSettings> {
  const supabase = createSupabaseBrowserClient();

  // 줄이 없을 수 있어서 single() 대신 maybeSingle() (0줄이면 에러 대신 null)
  const { data, error } = await supabase
    .from('user_settings')
    .select('hidden_types')
    .maybeSingle();

  if (error) throw error;
  const row: SettingsRow | null = data;
  return row ? toUserSettings(row) : DEFAULT_SETTINGS;
}

// 없으면 만들고 있으면 고친다. user_id는 보내지 않는다: 기본값 auth.uid()가 채우고,
// 그 값으로 기본 키 충돌을 판단해 수정으로 바뀐다
export async function updateHiddenTypes(
  hiddenTypes: string[],
): Promise<UserSettings> {
  const supabase = createSupabaseBrowserClient();

  const values: SettingsInsert = { hidden_types: hiddenTypes };
  const { data, error } = await supabase
    .from('user_settings')
    .upsert(values)
    .select('hidden_types')
    .single();

  if (error) throw error;
  const row: SettingsRow = data;
  return toUserSettings(row);
}
