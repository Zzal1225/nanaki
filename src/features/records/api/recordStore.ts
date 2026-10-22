import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { recordEntrySchema, type RecordEntry } from '../schema/recordEntry';
import { SCHEDULE_DRIVEN_TYPES } from '../schema/recordTypes';
import { toRecordEntry, toRecordInsert, type RecordRow } from './recordMapper';
import { toKeywordFilter } from './searchQuery';

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

// 모든 조회에 deleted_at is null: 소프트 삭제라 지운 기록도 테이블에 남아 있다.
// 정렬 끝에는 늘 id를 둔다: 날짜·만든 시각까지 같으면 DB는 순서를 보장하지 않아, 불러올 때마다 목록이 뒤바뀔 수 있다.
// id는 겹치지 않으므로 마지막 기준으로 두면 같은 데이터는 언제나 같은 순서로 나온다

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
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  return data
    .map(toRecordEntryOrWarn)
    .filter((e): e is RecordEntry => e !== null);
}

// 날짜와 상관없이 최근 기록 limit개 (기록 탭의 "최근 기록").
// 일어난 날짜가 최근인 순서, 같은 날은 나중에 만든 것이 먼저.
// 루틴 체크(일정으로 그리는 타입)는 DB에서 뺀다: 받아 온 뒤 버리면 매일 쌓인 체크가 limit을 다 차지해
// 다른 기록이 몇 개 안 남는다
export async function listRecentRecords(limit: number): Promise<RecordEntry[]> {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase
    .from('records')
    .select('*')
    .not('type', 'in', `(${SCHEDULE_DRIVEN_TYPES.join(',')})`)
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
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
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (error) {
    throw error;
  }

  return data
    .map(toRecordEntryOrWarn)
    .filter((e): e is RecordEntry => e !== null);
}

// 날짜와 상관없이, fields에 그 칸(field)이 있는 그 타입의 최근 기록 limit개 (체형 상세의 "최근 체중"과 바로 전 체중).
// 체형 기록은 체중·허리둘레가 섞여 있어 "최근 체형 기록 2개"로는 체중 2개를 보장할 수 없다 →
// DB에서 fields->weight가 있는 줄만 거른다 (PostgREST의 jsonb 경로 필터: fields->weight=not.is.null)
export async function listLatestRecordsWithField(
  type: RecordEntry['type'],
  field: string,
  limit: number,
): Promise<RecordEntry[]> {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('type', type)
    .not(`fields->${field}`, 'is', null)
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data
    .map(toRecordEntryOrWarn)
    .filter((e): e is RecordEntry => e !== null);
}

// 검색 한 번에 받는 최대 개수. 개인 기록이라 대부분 이 안에 들고, 넘으면 화면이 "검색어를 좁혀 주세요"라고 알린다.
// 페이지 나누기 대신 한 번에 받는 이유: 타입 칩의 건수와 타입 거르기를 받은 결과로 바로 계산할 수 있어
// 칩을 바꿀 때 요청이 다시 가지 않는다 (step2 오프라인에서도 같은 계산을 IndexedDB 결과에 그대로 쓴다)
export const SEARCH_RESULT_LIMIT = 300;

export type SearchSort = 'latest' | 'oldest';

export type SearchRecordsInput = {
  keyword: string;
  sort: SearchSort;
};

export type SearchRecordsResult = {
  entries: RecordEntry[];
  // 한도를 넘어 일부만 받았는지 (최신순이면 오래된 쪽이, 오래된순이면 최근 쪽이 빠진다)
  isTruncated: boolean;
};

// 검색어로 모든 타입의 기록을 찾는다. 타입 거르기는 받은 뒤 화면에서 한다 (위 SEARCH_RESULT_LIMIT 설명).
// 검색어가 비어 있으면 조건 없이 최근(또는 오래된) 기록부터 받는다
export async function searchRecords({
  keyword,
  sort,
}: SearchRecordsInput): Promise<SearchRecordsResult> {
  const supabase = createSupabaseBrowserClient();
  const ascending = sort === 'oldest';

  let query = supabase.from('records').select('*').is('deleted_at', null);
  if (keyword) query = query.or(toKeywordFilter(keyword));

  // 하나 더 받아서 한도를 넘었는지 안다 (count 요청을 따로 보내지 않는다)
  const { data, error } = await query
    .order('occurred_at', { ascending })
    .order('created_at', { ascending })
    .order('id', { ascending })
    .limit(SEARCH_RESULT_LIMIT + 1);

  if (error) {
    throw error;
  }

  return {
    entries: data
      .slice(0, SEARCH_RESULT_LIMIT)
      .map(toRecordEntryOrWarn)
      .filter((e): e is RecordEntry => e !== null),
    isTruncated: data.length > SEARCH_RESULT_LIMIT,
  };
}

// Postgres 고유 제약 위반 (records_routine_check_unique: 같은 루틴·같은 날 두 줄)
const UNIQUE_VIOLATION = '23505';

export type RoutineCheckInput = {
  routineId: string;
  // 체크한 그날의 루틴 이름 (기록 제목으로 남긴다)
  routineName: string;
  date: string;
  // 0이면 체크를 푼다 (기록을 지운다)
  count: number;
  target: number;
  unit: string;
};

async function findRoutineCheckId(
  routineId: string,
  date: string,
): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  // fields->>routineId: jsonb 안의 글자 값을 꺼내 비교한다 (PostgREST 경로 필터)
  const { data, error } = await supabase
    .from('records')
    .select('id')
    .eq('type', 'routine')
    .eq('occurred_at', date)
    .eq('fields->>routineId', routineId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

// 루틴 체크 저장: 루틴 하나 × 하루 = 기록 한 줄 (2026-10-22 사용자 결정).
// "있으면 고치고, 없으면 만들고, 0이면 지운다". 두 기기가 동시에 "없음"을 보고 둘 다 만들면
// DB 고유 색인이 둘째를 막는다(23505) → 그때는 먼저 생긴 줄을 다시 찾아 고친다.
// upsert(on conflict)를 쓰지 않는 이유: 이 고유 색인은 식(fields->>'routineId')과 조건(where)이 붙은 부분 색인이라
// PostgREST의 on_conflict(칸 이름 목록)로 가리킬 수 없다
export async function setRoutineCheck(input: RoutineCheckInput): Promise<void> {
  const existingId = await findRoutineCheckId(input.routineId, input.date);

  if (input.count === 0) {
    if (existingId) await deleteRecord(existingId);
    return;
  }

  const record = {
    type: 'routine' as const,
    occurredAt: input.date,
    title: input.routineName,
    memo: null,
    tags: [],
    fields: {
      routineId: input.routineId,
      count: input.count,
      target: input.target,
      unit: input.unit,
    },
  };

  if (existingId) {
    await updateRecord({ ...record, id: existingId });
    return;
  }

  try {
    await createRecord(record);
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    if (code !== UNIQUE_VIOLATION) throw error;
    const winnerId = await findRoutineCheckId(input.routineId, input.date);
    if (!winnerId) throw error;
    await updateRecord({ ...record, id: winnerId });
  }
}
