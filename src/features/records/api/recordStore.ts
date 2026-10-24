import {
  currentLocalDb,
  syncBeforeRead,
  syncForRead,
} from '@/lib/db/currentLocalDb';
import type {
  LocalDb,
  LocalRecordRow,
  OutboxRecordRow,
  SyncCursor,
} from '@/lib/db/localDb';
import {
  createTableSync,
  hasPulledOnce,
  pullChanges,
  toAfterCursorFilter,
} from '@/lib/db/sync';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { DateRange } from '@/shared/date/monthRange';
import { recordEntrySchema, type RecordEntry } from '../schema/recordEntry';
import { SCHEDULE_DRIVEN_TYPES } from '../schema/recordTypes';
import { toRecordEntry, toRecordInsert, type RecordRow } from './recordMapper';
import {
  flushRecordOutbox,
  hasFailedRecords,
  pendingRecordIds,
  retryFailedRecords,
} from './recordOutbox';
import { matchesKeyword } from './searchQuery';

// 기록 저장·조회는 이 파일의 함수로만 한다. 훅·컴포넌트는 Supabase·IndexedDB를 직접 부르지 않는다.
// 25b부터 안쪽이 바뀌었다 (위의 훅과 화면은 그대로):
// - 조회: 서버의 바뀐 줄을 기기 사본(IndexedDB)에 받은 뒤(sync), 사본에서 읽는다 → 오프라인에서도 그려진다
// - 쓰기(25c): 사본에 먼저 쓰고 대기열(outbox)에 쌓는다 → 뒤에서 서버로 보낸다 (recordOutbox)
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
    // 아직 보내지 않은 내 변경이 있는 기록은 서버의 예전 내용으로 덮어쓰지 않는다
    pendingIds: () => pendingRecordIds(db),
  }),
);

// 조회 전에 부른다: 바뀐 것을 받아 두고(실패·오프라인·3초 넘김이면 기다리지 않음) 사본을 돌려준다
async function readyLocalDb(): Promise<LocalDb> {
  const db = await currentLocalDb();
  // 처음 방문이면 다 받을 때까지 기다리고 실패하면 오류로 (빈 사본을 "기록 없음"으로 그리지 않게, syncForRead)
  await syncForRead(db, 'records', () => syncRecords(db));
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
// 처음 방문에서 서버를 기다리는 최대 시간. 넘거나 실패하면 기기 사본(아직 비었을 수 있음)으로 답한다
const FIRST_VISIT_TIMEOUT_MS = 10_000;

// 처음 방문(이 기기에 사본이 아직 없음)에는 보는 기간만 서버에서 바로 받는다 (26단계 성능).
// 사본을 채우는 전체 동기화는 기록이 많을수록 오래 걸려서(한 달 300개 × 2달 = 213KiB, 1.7초),
// 그것을 기다린 뒤 그리면 처음 방문이 25 이전(그 달만 받던 때)보다 느려졌다 (6.4초 → 7.2초).
// 전체 동기화는 뒤에서 하고, 끝나면 LOCAL_DB_CHANGED_EVENT로 화면이 사본 기준으로 다시 그려진다
async function fetchRangeOnFirstVisit(
  db: LocalDb,
  from: string,
  to: string,
): Promise<RecordEntry[] | null> {
  if (await hasPulledOnce(db, 'records')) return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return null;
  }
  const supabase = createSupabaseBrowserClient();
  try {
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .gte('occurred_at', from)
      .lte('occurred_at', to)
      .is('deleted_at', null)
      .order('occurred_at', { ascending: true })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .abortSignal(AbortSignal.timeout(FIRST_VISIT_TIMEOUT_MS));
    if (error) return null;
    return toEntries(data);
  } finally {
    // 전체 동기화는 기간 조회가 끝난 뒤에 시작한다. 같이 출발하면 느린 회선을 나눠 써서
    // 기간 조회도 늦어졌다 (26단계 측정: 받는 양은 213KiB → 106KiB로 줄었는데 요청 시간은 1.7초 그대로)
    void syncBeforeRead('records', () => syncRecords(db));
  }
}

export async function listRecords(
  from: string,
  to: string,
): Promise<RecordEntry[]> {
  const firstVisit = await fetchRangeOnFirstVisit(
    await currentLocalDb(),
    from,
    to,
  );
  if (firstVisit) return firstVisit;
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
  return toEntries(rows);
}

// 사본의 모든 기록, 최근 것부터 (나키가 사용자가 만든 분류·태그 이름을 모을 때, naki/nakiCustomNames).
// 사본 전체라 네트워크 없이 읽고, 기록이 수천 개여도 색인 순서대로 한 번 읽는다
export async function listAllRecordsNewestFirst(): Promise<RecordEntry[]> {
  const db = await readyLocalDb();
  const rows = await db.records
    .orderBy('[occurred_at+created_at+id]')
    .reverse()
    .toArray();
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

// ── 쓰기 (기기 사본 먼저 → 대기열 → 서버) ───────────────
// 모든 쓰기는 사본과 대기열(outbox)을 한 트랜잭션으로 바꾼 뒤 바로 끝난다. 서버로 보내기는 뒤에서 한다 (recordOutbox).
// 온라인이어도 같은 길로 간다 (2026-10-22 사용자 결정): 저장 버튼이 늘 바로 끝나고, 오프라인과 동작이 같다

function nowIso(): string {
  return new Date().toISOString();
}

function toOutboxRow(entry: RecordEntry): OutboxRecordRow {
  const insert = toRecordInsert(entry);
  return {
    id: entry.id,
    type: insert.type,
    occurred_at: insert.occurred_at,
    title: insert.title,
    memo: insert.memo ?? null,
    tags: insert.tags ?? [],
    fields: insert.fields ?? {},
  };
}

// 기기에서 만든·고친 줄. 시각 칸은 서버가 다시 붙인다 (보낸 뒤 돌려받은 줄로 덮어쓴다).
// 만든 시각은 처음 값을 유지해서, 고쳐도 같은 날 기록 사이의 순서가 바뀌지 않게 한다
function toLocalRow(
  entry: RecordEntry,
  userId: string,
  existing: LocalRecordRow | undefined,
): LocalRecordRow {
  const now = nowIso();
  return {
    ...toOutboxRow(entry),
    user_id: userId,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    deleted_at: null,
  };
}

// 쌓은 뒤 보내기를 시작한다. 기다리지 않는다: 저장은 사본에 쓴 순간 끝났고, 보내기 결과는 화면이 이벤트로 받는다
function startFlush(db: LocalDb): void {
  void flushRecordOutbox(db);
}

async function saveLocally(
  // 검사 전 값 (스키마가 RecordEntry로 확인한다)
  entry: unknown,
  mustExist: boolean,
): Promise<RecordEntry> {
  const db = await currentLocalDb();
  const checked = recordEntrySchema.parse(entry);
  await db.transaction('rw', db.records, db.outbox, async () => {
    const existing = await db.records.get(checked.id);
    if (mustExist && !existing) {
      throw new Error(`수정할 기록이 없음: ${checked.id}`);
    }
    await db.records.put(toLocalRow(checked, db.userId, existing));
    await db.outbox.add({
      kind: 'upsert',
      recordId: checked.id,
      row: toOutboxRow(checked),
      queuedAt: nowIso(),
    });
  });
  startFlush(db);
  return checked;
}

export async function createRecord(
  input: NewRecordInput,
): Promise<RecordEntry> {
  // id를 브라우저가 만든다: 서버 없이(오프라인) 만들 수 있고, 다시 보내도 같은 id라 중복이 생기지 않는다.
  // 폼을 거치지 않은 호출도 막으려고 저장 직전에 한 번 더 검사한다 (saveLocally)
  return saveLocally({ ...input, id: crypto.randomUUID() }, false);
}

// 지운 기록은 고치지 않는다 (사본에 없으면 오류로 알린다)
export async function updateRecord(entry: RecordEntry): Promise<RecordEntry> {
  return saveLocally(entry, true);
}

// 여러 기록을 한 번에 (체험하기 예시 기록). 체험하기 버튼 바로 뒤라 온라인이 확실하고,
// 일부만 들어가면 안 돼서 대기열을 거치지 않고 요청 하나(배열 insert)로 서버에 보낸다
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

// 백업 불러오기 (step4 39): 이미 있는 id는 건너뛰고(ignoreDuplicates) 새로 들어간 줄만 사본에 넣는다.
// 대기열을 거치지 않는다: 불러오기는 온라인 전용이고, 수천 개를 하나씩 대기열에 쌓으면 느리다. 요청 하나가 너무 커지지 않게 나눠 보낸다
export const IMPORT_CHUNK_SIZE = 500;

export async function importRecords(entries: RecordEntry[]): Promise<number> {
  const supabase = createSupabaseBrowserClient();
  let inserted = 0;
  for (let start = 0; start < entries.length; start += IMPORT_CHUNK_SIZE) {
    const rows = entries
      .slice(start, start + IMPORT_CHUNK_SIZE)
      .map((entry) => toRecordInsert(recordEntrySchema.parse(entry)));
    const { data, error } = await supabase
      .from('records')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
      .select();
    if (error) throw error;
    await applyServerRows(data);
    inserted += data.length;
  }
  return inserted;
}

// 이미 보낸 삭제를 되돌릴 때 사본에 다시 넣을 줄 (되돌리기는 지운 직후 5초 안에만 보인다)
const recentlyDeleted = new Map<string, LocalRecordRow>();

// 소프트 삭제: 서버에는 deleted_at만 채운다(되돌리기와 다른 기기로 지운 사실 전파).
// 사본에서는 바로 빼고, 지우기 전 줄을 대기열에 같이 둔다 (보내기 전에 되돌리면 그 줄을 다시 넣는다)
export async function deleteRecord(id: string): Promise<void> {
  const db = await currentLocalDb();
  await db.transaction('rw', db.records, db.outbox, async () => {
    const previous = await db.records.get(id);
    if (!previous) return;
    await db.records.delete(id);
    await db.outbox.add({
      kind: 'delete',
      recordId: id,
      deletedAt: nowIso(),
      previous,
      queuedAt: nowIso(),
    });
    recentlyDeleted.set(id, previous);
  });
  startFlush(db);
}

// 삭제 되돌리기.
// - 아직 안 보낸 삭제면 그 삭제를 대기열에서 빼고 줄을 되돌린다 (서버는 지운 적도 모른다)
// - 이미 보냈으면 "되살리기"를 쌓는다
// 둘 다 아니면(되돌릴 줄을 모름) 거짓으로 "되돌렸어요"라고 하지 않게 오류로 알린다
export async function restoreRecord(id: string): Promise<void> {
  const db = await currentLocalDb();
  await db.transaction('rw', db.records, db.outbox, async () => {
    const pendingDelete = await db.outbox
      .where('recordId')
      .equals(id)
      .filter((op) => op.kind === 'delete')
      .last();
    if (pendingDelete?.kind === 'delete') {
      await db.outbox.delete(pendingDelete.seq!);
      await db.records.put(pendingDelete.previous);
      return;
    }
    const previous = recentlyDeleted.get(id);
    if (!previous) throw new Error(`되돌릴 기록이 없음: ${id}`);
    await db.records.put({ ...previous, deleted_at: null });
    await db.outbox.add({ kind: 'restore', recordId: id, queuedAt: nowIso() });
  });
  recentlyDeleted.delete(id);
  startFlush(db);
}

// ── 루틴 체크 ─────────────────────────────────────────

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

// 루틴 체크 저장: 루틴 하나 × 하루 = 기록 한 줄 (2026-10-22 사용자 결정). "있으면 고치고, 없으면 만들고, 0이면 지운다".
// 25c부터 "있는지"를 사본에서 찾는다 → 오프라인에서도 체크된다.
// 두 기기가 따로 같은 날을 체크하면 서버 고유 색인이 둘째를 막고(23505), 보내기(recordOutbox)가 먼저 생긴 줄로 합친다
export async function setRoutineCheck(input: RoutineCheckInput): Promise<void> {
  const db = await currentLocalDb();
  const existing = await db.records
    .where('[type+occurred_at]')
    .equals(['routine', input.date])
    .filter(
      (row) =>
        (row.fields as { routineId?: unknown } | null)?.routineId ===
        input.routineId,
    )
    .first();

  if (input.count === 0) {
    if (existing) await deleteRecord(existing.id);
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

  if (existing) {
    await updateRecord({ ...record, id: existing.id });
  } else {
    await createRecord(record);
  }
}

// ── 대기열 상태 (화면용) ───────────────────────────────

// 아직 서버에 보내지 않은 기록 id (목록의 구름 아이콘)
export async function listPendingRecordIds(): Promise<string[]> {
  const db = await currentLocalDb();
  return [...(await pendingRecordIds(db))];
}

// 연결이 돌아왔을 때·앱을 열 때 쌓인 것을 보낸다 (OutboxSync)
export async function sendPendingRecords(): Promise<void> {
  const db = await currentLocalDb();
  await flushRecordOutbox(db);
}

// "다시 시도": 서버가 거절해 멈춘 기록을 다시 보낸다
export async function retryFailedRecordSends(): Promise<void> {
  const db = await currentLocalDb();
  await retryFailedRecords(db);
}

// 서버가 거절해 멈춰 있는 기록이 있는지 (앱을 열 때 "다시 시도"를 다시 보여 줄지)
export async function hasFailedRecordSends(): Promise<boolean> {
  const db = await currentLocalDb();
  return hasFailedRecords(db);
}
