import { currentLocalDb, warnSyncFailure } from '@/lib/db/currentLocalDb';
import type { LocalDb, LocalRecordRow, SyncCursor } from '@/lib/db/localDb';
import {
  createTableSync,
  pullChanges,
  toAfterCursorFilter,
} from '@/lib/db/sync';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { DateRange } from '@/shared/date/monthRange';
import { recordEntrySchema, type RecordEntry } from '../schema/recordEntry';
import { SCHEDULE_DRIVEN_TYPES } from '../schema/recordTypes';
import { toRecordEntry, toRecordInsert, type RecordRow } from './recordMapper';
import { matchesKeyword } from './searchQuery';

// 기록 저장·조회는 이 파일의 함수로만 한다. 훅·컴포넌트는 Supabase·IndexedDB를 직접 부르지 않는다.
// 25b부터 안쪽이 바뀌었다 (위의 훅과 화면은 그대로):
// - 조회: 서버의 바뀐 줄을 기기 사본(IndexedDB)에 받은 뒤(sync), 사본에서 읽는다 → 오프라인에서도 그려진다
// - 쓰기: 지금은 서버에 보내고, 서버가 돌려준 줄을 사본에 바로 넣는다 (오프라인 작성 대기열은 25c)
// "내 기록만" 조건은 쓰지 않는다. 서버는 RLS가 auth.uid() = user_id를 붙이고, 사본은 계정마다 따로다

// 망가진 기록 하나 때문에 목록 전체가 안 보이면 안 되므로, 그 줄만 건너뛰고 어느 줄인지 남긴다
function toRecordEntryOrWarn(row: RecordRow): RecordEntry | null {
  const entry = toRecordEntry(row);
  if (!entry) console.warn('[records] 검증 실패로 기록을 건너뜀', row.id);
  return entry;
}

function toEntries(rows: readonly RecordRow[]): RecordEntry[] {
  return rows
    .map(toRecordEntryOrWarn)
    .filter((e): e is RecordEntry => e !== null);
}

// 새 기록 입력값: RecordEntry에서 id만 뺀 것 (id는 createRecord가 만든다)
// Omit<RecordEntry, 'id'>로 쓰면 유니온이 하나로 뭉개져 type과 fields의 짝이 사라진다.
// T extends unknown ? ... 모양은 유니온의 각 타입(가계부, 후기)마다 따로 Omit을 적용한다 (분배 조건부 타입)
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;
export type NewRecordInput = DistributiveOmit<RecordEntry, 'id'>;

// ── 동기화 ────────────────────────────────────────────

async function fetchRecordChanges(
  after: SyncCursor | null,
  limit: number,
): Promise<RecordRow[]> {
  const supabase = createSupabaseBrowserClient();
  // 지운 줄도 받는다: 다른 기기에서 지운 사실이 내려와야 사본에서도 뺄 수 있다 (소프트 삭제가 필요한 이유)
  let query = supabase.from('records').select('*');
  if (after) query = query.or(toAfterCursorFilter(after));
  const { data, error } = await query
    .order('updated_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data;
}

const syncRecords = createTableSync((db) =>
  pullChanges({
    db,
    table: 'records',
    target: db.records,
    fetchChanges: fetchRecordChanges,
    isRemoved: (row) => row.deleted_at !== null,
  }),
);

// 조회 전에 부른다: 바뀐 것을 받아 두고(실패하면 그냥 넘어감) 사본을 돌려준다
async function readyLocalDb(): Promise<LocalDb> {
  const db = await currentLocalDb();
  (globalThis as unknown as { __offlineTrace?: string[] }).__offlineTrace ??= []; (globalThis as unknown as { __offlineTrace: string[] }).__offlineTrace.push('DEBUG records sync 시작 ' + performance.now());
  await syncRecords(db).catch((error: unknown) =>
    warnSyncFailure('records', error),
  );
  (globalThis as unknown as { __offlineTrace?: string[] }).__offlineTrace ??= []; (globalThis as unknown as { __offlineTrace: string[] }).__offlineTrace.push('DEBUG records sync 끝 ' + performance.now());
  return db;
}

// 서버가 돌려준 줄을 사본에 반영한다 (다음 동기화를 기다리지 않고 화면에 바로 보이게).
// 커서는 건드리지 않는다: 커서는 "그 시각까지 서버의 모든 변경을 받았다"는 뜻이라, 내 줄 하나로 앞당기면
// 그사이 다른 기기의 변경을 건너뛴다
async function applyServerRows(rows: readonly RecordRow[]): Promise<void> {
  const db = await currentLocalDb();
  await db.transaction('rw', db.records, async () => {
    await db.records.bulkPut(rows.filter((row) => row.deleted_at === null));
    await db.records.bulkDelete(
      rows.filter((row) => row.deleted_at !== null).map((row) => row.id),
    );
  });
}

// ── 정렬 ──────────────────────────────────────────────
// 서버 목록과 같은 순서: 날짜 → 만든 시각 → id. 끝에 늘 id를 둔다:
// 날짜·만든 시각까지 같으면 순서가 정해지지 않아, 불러올 때마다 목록이 뒤바뀔 수 있다

function compareRows(a: LocalRecordRow, b: LocalRecordRow): number {
  if (a.occurred_at !== b.occurred_at) {
    return a.occurred_at < b.occurred_at ? -1 : 1;
  }
  if (a.created_at !== b.created_at)
    return a.created_at < b.created_at ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

function sortRows(
  rows: LocalRecordRow[],
  order: 'asc' | 'desc',
): LocalRecordRow[] {
  const sign = order === 'asc' ? 1 : -1;
  return rows.sort((a, b) => sign * compareRows(a, b));
}

// ── 조회 (기기 사본) ───────────────────────────────────

// 기간 안의 기록 (홈 캘린더·기록 탭 카드). 같은 날짜끼리는 만든 순서로
export async function listRecords(
  from: string,
  to: string,
): Promise<RecordEntry[]> {
  const db = await readyLocalDb();
  const rows = await db.records
    .where('occurred_at')
    .between(from, to, true, true)
    .toArray();
  return toEntries(sortRows(rows, 'asc'));
}

// 날짜와 상관없이 최근 기록 limit개 (기록 탭의 "최근 기록").
// 일어난 날짜가 최근인 순서, 같은 날은 나중에 만든 것이 먼저.
// 루틴 체크(일정으로 그리는 타입)는 뺀다: 매일 쌓인 체크가 limit을 다 차지하면 다른 기록이 몇 개 안 남는다.
// [occurred_at+created_at+id] 색인을 거꾸로 읽어 limit개에서 멈춘다 (전체를 정렬하지 않는다)
export async function listRecentRecords(limit: number): Promise<RecordEntry[]> {
  const db = await readyLocalDb();
  const rows = await db.records
    .orderBy('[occurred_at+created_at+id]')
    .reverse()
    .filter((row) => !SCHEDULE_DRIVEN_TYPES.some((type) => type === row.type))
    .limit(limit)
    .toArray();
  (globalThis as unknown as { __offlineTrace?: string[] }).__offlineTrace ??= []; (globalThis as unknown as { __offlineTrace: string[] }).__offlineTrace.push('DEBUG recent 읽음 ' + rows.length);
  return toEntries(rows);
}

export async function getRecord(id: string): Promise<RecordEntry | null> {
  const db = await readyLocalDb();
  // 사본에 없으면 지운 기록이거나 다른 계정의 기록이다 (사본은 계정마다 따로)
  const row = await db.records.get(id);
  return row ? toRecordEntryOrWarn(row) : null;
}

// 한 타입의 기간 안 기록 (타입 상세). 목록은 최근 것이 위라 내림차순
export async function listRecordsOfType(
  type: RecordEntry['type'],
  from: string,
  to: string,
): Promise<RecordEntry[]> {
  const db = await readyLocalDb();
  const rows = await db.records
    .where('[type+occurred_at]')
    .between([type, from], [type, to], true, true)
    .toArray();
  return toEntries(sortRows(rows, 'desc'));
}

// 날짜와 상관없이, fields에 그 칸(field)이 있는 그 타입의 최근 기록 limit개 (체형 상세의 "최근 체중"과 바로 전 체중).
// 체형 기록은 체중·허리둘레가 섞여 있어 "최근 체형 기록 2개"로는 체중 2개를 보장할 수 없다 → 그 칸이 있는 줄만 거른다
export async function listLatestRecordsWithField(
  type: RecordEntry['type'],
  field: string,
  limit: number,
): Promise<RecordEntry[]> {
  const db = await readyLocalDb();
  const rows = await db.records
    .where('[type+occurred_at]')
    .between([type, ''], [type, '￿'], true, true)
    .filter((row) => {
      const fields = row.fields as Record<string, unknown> | null;
      return fields?.[field] !== undefined && fields?.[field] !== null;
    })
    .toArray();
  return toEntries(sortRows(rows, 'desc').slice(0, limit));
}

// 검색 한 번에 보여 주는 최대 개수. 넘으면 화면이 "검색어나 기간을 좁혀 주세요"라고 알린다.
// 페이지 나누기 대신 한 번에 받는 이유: 타입 칩의 건수와 타입·칸 거르기를 받은 결과로 바로 계산할 수 있다
export const SEARCH_RESULT_LIMIT = 300;

export type SearchSort = 'latest' | 'oldest';

export type SearchRecordsInput = {
  keyword: string;
  sort: SearchSort;
  // 기간 필터. 색인(occurred_at)으로 먼저 좁힌다
  range: DateRange | null;
};

export type SearchRecordsResult = {
  entries: RecordEntry[];
  // 한도를 넘어 일부만 보여 주는지 (최신순이면 오래된 쪽이, 오래된순이면 최근 쪽이 빠진다)
  isTruncated: boolean;
};

// 검색어·기간으로 모든 타입의 기록을 찾는다 (기기 사본이라 오프라인에서도 된다).
// 타입·칸 필터(분류·금액…)는 화면에서 거른다 (search/searchFilters)
export async function searchRecords({
  keyword,
  sort,
  range,
}: SearchRecordsInput): Promise<SearchRecordsResult> {
  const db = await readyLocalDb();
  const rows = range
    ? await db.records
        .where('occurred_at')
        .between(range.from, range.to, true, true)
        .toArray()
    : await db.records.toArray();
  const matched = toEntries(
    sortRows(rows, sort === 'oldest' ? 'asc' : 'desc'),
  ).filter((entry) => matchesKeyword(entry, keyword));
  return {
    entries: matched.slice(0, SEARCH_RESULT_LIMIT),
    isTruncated: matched.length > SEARCH_RESULT_LIMIT,
  };
}

// ── 쓰기 (서버 → 사본) ─────────────────────────────────

export async function createRecord(
  input: NewRecordInput,
): Promise<RecordEntry> {
  const supabase = createSupabaseBrowserClient();

  // id를 브라우저가 만들어야 오프라인(25c)에서 서버 없이 기록을 만들 수 있다.
  // 폼을 거치지 않은 호출도 막으려고 저장 직전에 한 번 더 검사한다
  const entry = recordEntrySchema.parse({ ...input, id: crypto.randomUUID() });

  const { data, error } = await supabase
    .from('records')
    .insert(toRecordInsert(entry))
    .select()
    .single();

  if (error) throw error;
  await applyServerRows([data]);

  // 방금 검사를 통과한 값이라 정상이면 일어나지 않는다. 일어나면 조용히 넘기지 않고 알린다
  const saved = toRecordEntryOrWarn(data);
  if (!saved) throw new Error(`저장된 기록을 읽을 수 없음: ${data.id}`);
  return saved;
}

// 여러 기록을 한 번에 (체험하기 예시 기록). createRecord를 여러 번 부르면 요청이 기록 수만큼 가고,
// 중간에 실패하면 일부만 들어간다. 배열 insert는 요청 하나라 전부 들어가거나 전부 안 들어간다
export async function createRecords(inputs: NewRecordInput[]): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  const rows = inputs.map((input) =>
    toRecordInsert(
      recordEntrySchema.parse({ ...input, id: crypto.randomUUID() }),
    ),
  );

  const { data, error } = await supabase.from('records').insert(rows).select();
  if (error) throw error;
  await applyServerRows(data);
}

// updated_at은 보내지 않는다. DB 트리거가 붙인다 (동기화 커서의 기준이라 서버 시각이어야 한다)
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
  await applyServerRows([data]);

  const saved = toRecordEntryOrWarn(data);
  if (!saved) throw new Error(`수정된 기록을 읽을 수 없음: ${data.id}`);
  return saved;
}

// 줄을 지우지 않고 deleted_at만 채운다(소프트 삭제). 되돌리기와 동기화(지운 사실 전파)를 위해.
// 이미 지운 기록이면 처음 지운 시각을 덮어쓰지 않는다
export async function deleteRecord(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase
    .from('records')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select();

  if (error) throw error;
  await applyServerRows(data);
}

// 삭제 되돌리기: deleted_at을 비운다 (소프트 삭제라 줄이 그대로 남아 있어서 가능하다).
// 지운 기록만 대상으로 해서, 이미 되돌린 기록을 또 건드리지 않는다
export async function restoreRecord(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  // select로 실제로 바뀐 줄을 돌려받는다. update는 조건에 맞는 줄이 0개여도 오류가 아니라서,
  // 확인하지 않으면 그사이 줄이 아예 지워진 경우(대시보드에서 직접 삭제 등)에도
  // "되돌렸어요"라고 거짓으로 알리게 된다
  const { data, error } = await supabase
    .from('records')
    .update({ deleted_at: null })
    .eq('id', id)
    .not('deleted_at', 'is', null)
    .select();

  if (error) throw error;
  if (data.length === 0) throw new Error(`되돌릴 기록이 없음: ${id}`);
  await applyServerRows(data);
}

// ── 루틴 체크 ─────────────────────────────────────────

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

// "이미 있는 체크"는 서버에 묻는다: 다른 기기에서 방금 만든 체크를 사본이 아직 모를 수 있고,
// 하루 한 줄 규칙(고유 색인)을 지키는 곳이 서버라서다 (오프라인 체크는 25c에서 바뀐다)
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
