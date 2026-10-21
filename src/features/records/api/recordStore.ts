import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { recordEntrySchema, type RecordEntry } from '../schema/recordEntry';
import { toRecordEntry, toRecordInsert, type RecordRow } from './recordMapper';

// 기록 저장·조회는 이 파일의 함수로만 한다. 훅·컴포넌트는 Supabase를 직접 부르지 않는다.
// step2에서 이 파일 안쪽만 Dexie + outbox로 바꾸면 위의 훅과 화면은 그대로 둘 수 있다.
// "내 기록만" 조건은 쓰지 않는다. RLS 정책이 모든 요청에 auth.uid() = user_id를 붙이고,
// 브라우저 코드의 조건은 사용자가 지울 수 있어서 보안이 되지 않는다

// 망가진 기록 하나 때문에 목록 전체가 안 보이면 안 되므로, 그 줄만 건너뛰고 어느 줄인지 남긴다
function toRecordEntryOrWarn(row: RecordRow): RecordEntry | null {
  const entry = toRecordEntry(row);
  if (!entry) console.warn('[records] 검증 실패로 기록을 건너뜀', row.id);
  return entry;
}

// 새 기록 입력값: RecordEntry에서 id만 뺀 것 (id는 createRecord가 만든다)
// Omit<RecordEntry, 'id'>로 쓰면 유니온이 하나로 뭉개져 type과 fields의 짝이 사라진다.
// T extends unknown ? ... 모양은 유니온의 각 타입(가계부, 후기)마다 따로 Omit을 적용한다 (분배 조건부 타입)
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;
export type NewRecordInput = DistributiveOmit<RecordEntry, 'id'>;

// 모든 조회에 deleted_at is null: 소프트 삭제라 지운 기록도 테이블에 남아 있다

export async function listRecords(
  from: string,
  to: string,
): Promise<RecordEntry[]> {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase
    .from('records')
    .select('*')
    .gte('occurred_at', from)
    .lte('occurred_at', to)
    .is('deleted_at', null)
    // 같은 날짜끼리는 만든 순서로. 기준이 없으면 새로고침할 때마다 순서가 바뀔 수 있다
    .order('occurred_at', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data
    .map(toRecordEntryOrWarn)
    .filter((e): e is RecordEntry => e !== null);
}

// 날짜와 상관없이 최근 기록 limit개 (기록 탭의 "최근 기록").
// 일어난 날짜가 최근인 순서, 같은 날은 나중에 만든 것이 먼저
export async function listRecentRecords(limit: number): Promise<RecordEntry[]> {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase
    .from('records')
    .select('*')
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data
    .map(toRecordEntryOrWarn)
    .filter((e): e is RecordEntry => e !== null);
}

export async function getRecord(id: string): Promise<RecordEntry | null> {
  const supabase = createSupabaseBrowserClient();

  // single()은 0줄이면 에러라서, "없음"을 null로 받으려고 maybeSingle()
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;

  return toRecordEntryOrWarn(data);
}

export async function createRecord(
  input: NewRecordInput,
): Promise<RecordEntry> {
  const supabase = createSupabaseBrowserClient();

  // id를 브라우저가 만들어야 step2에서 서버 없이(오프라인) 기록을 만들 수 있다.
  // 폼을 거치지 않은 호출도 막으려고 저장 직전에 한 번 더 검사한다
  const entry = recordEntrySchema.parse({ ...input, id: crypto.randomUUID() });

  const { data, error } = await supabase
    .from('records')
    .insert(toRecordInsert(entry))
    .select()
    .single();

  if (error) throw error;

  // 방금 검사를 통과한 값이라 정상이면 일어나지 않는다. 일어나면 조용히 넘기지 않고 알린다
  const saved = toRecordEntryOrWarn(data);
  if (!saved) throw new Error(`저장된 기록을 읽을 수 없음: ${data.id}`);
  return saved;
}

// 여러 기록을 한 번에 (체험하기 예시 기록). createRecord를 여러 번 부르면 요청이 기록 수만큼 가고,
// 중간에 실패하면 일부만 들어간다. 배열 insert는 요청 하나라 전부 들어가거나 전부 안 들어간다.
// 저장한 기록을 돌려받지 않는다: 부르는 쪽은 목록 캐시를 무효화해 다시 불러온다
export async function createRecords(inputs: NewRecordInput[]): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  const rows = inputs.map((input) =>
    toRecordInsert(
      recordEntrySchema.parse({ ...input, id: crypto.randomUUID() }),
    ),
  );

  const { error } = await supabase.from('records').insert(rows);
  if (error) throw error;
}

// updated_at은 보내지 않는다. DB 트리거가 붙인다 (동기화 충돌의 기준이라 서버 시각이어야 한다)
export async function updateRecord(entry: RecordEntry): Promise<RecordEntry> {
  const supabase = createSupabaseBrowserClient();

  const checked = recordEntrySchema.parse(entry);

  // 지운 기록은 고치지 않는다. 0줄이면 조용히 넘기지 않고 에러로 알린다
  const { data, error } = await supabase
    .from('records')
    .update(toRecordInsert(checked))
    .eq('id', checked.id)
    .is('deleted_at', null)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`수정할 기록이 없음: ${checked.id}`);

  const saved = toRecordEntryOrWarn(data);
  if (!saved) throw new Error(`수정된 기록을 읽을 수 없음: ${data.id}`);
  return saved;
}

// 줄을 지우지 않고 deleted_at만 채운다(소프트 삭제). 되돌리기와 step2 동기화(지운 사실 전파)를 위해.
// 이미 지운 기록이면 처음 지운 시각을 덮어쓰지 않는다
export async function deleteRecord(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase
    .from('records')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw error;
}

// 삭제 되돌리기: deleted_at을 비운다 (소프트 삭제라 줄이 그대로 남아 있어서 가능하다).
// 지운 기록만 대상으로 해서, 이미 되돌린 기록을 또 건드리지 않는다
export async function restoreRecord(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  // select로 실제로 바뀐 줄을 돌려받는다. update는 조건에 맞는 줄이 0개여도 오류가 아니라서,
  // 확인하지 않으면 그사이 줄이 아예 지워진 경우(대시보드에서 직접 삭제, step2에서 다른 기기의 정리 등)에도
  // "되돌렸어요"라고 거짓으로 알리게 된다
  const { data, error } = await supabase
    .from('records')
    .update({ deleted_at: null })
    .eq('id', id)
    .not('deleted_at', 'is', null)
    .select('id');

  if (error) throw error;
  if (data.length === 0) throw new Error(`되돌릴 기록이 없음: ${id}`);
}

// 한 타입의 기간 안 기록 (타입 상세). 목록은 최근 것이 위라 내림차순.
// 타입 조건을 DB에서 건다: 다른 타입 기록까지 받아 와서 브라우저에서 버리지 않게
export async function listRecordsOfType(
  type: RecordEntry['type'],
  from: string,
  to: string,
): Promise<RecordEntry[]> {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('type', type)
    .gte('occurred_at', from)
    .lte('occurred_at', to)
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data
    .map(toRecordEntryOrWarn)
    .filter((e): e is RecordEntry => e !== null);
}
