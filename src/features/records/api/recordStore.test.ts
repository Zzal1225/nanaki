import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeLocalDb, openLocalDb } from '@/lib/db/localDb';
import { hasPulledOnce, NIL_UUID } from '@/lib/db/sync';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { createFakeBrowserClient } from '@/lib/supabase/fakeBrowserClient.testing';
import { buildSampleRecords } from '../sample/sampleRecords';
import type { RecordRow } from './recordMapper';
import {
  createRecord,
  createRecords,
  deleteRecord,
  getRecord,
  listLatestRecordsWithField,
  listPendingRecordIds,
  listRecentRecords,
  listRecords,
  restoreRecord,
  SEARCH_RESULT_LIMIT,
  searchRecords,
  setRoutineCheck,
  updateRecord,
  type NewRecordInput,
} from './recordStore';
import { flushRecordOutbox } from './recordOutbox';

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: vi.fn(),
}));
// 보내기는 recordOutbox.test에서 따로 본다. 여기서는 "쓰면 보내기를 시작한다"까지만
vi.mock('./recordOutbox', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  flushRecordOutbox: vi.fn(async () => 'done'),
}));

// 기록 id는 UUID여야 검증을 통과한다. 테스트에서는 이름으로 부르고 같은 이름은 같은 UUID로
const ids = new Map<string, string>();
function uid(name: string): string {
  if (!ids.has(name)) {
    ids.set(
      name,
      `00000000-0000-4000-8000-${String(ids.size).padStart(12, '0')}`,
    );
  }
  return ids.get(name)!;
}
const nameOf = (id: string) =>
  [...ids.entries()].find(([, value]) => value === id)?.[0];

// 서버 줄 (DB 칸 이름). 만든 시각은 넣은 순서대로 늘어난다
let clock = 0;
function row(partial: Partial<RecordRow> & { id: string }): RecordRow {
  clock += 1;
  const time = new Date(Date.UTC(2026, 9, 22, 0, 0, clock)).toISOString();
  return {
    user_id: 'u',
    type: 'expense',
    occurred_at: '2026-10-21',
    title: partial.id,
    memo: null,
    tags: [],
    fields: { amount: 1000, category: '식비' },
    created_at: time,
    updated_at: time,
    deleted_at: null,
    ...partial,
    id: uid(partial.id),
  };
}

// 테스트마다 다른 계정 → 다른 기기 사본(IndexedDB)과 다른 동기화 기록으로 시작한다
let userCount = 0;
let server: ReturnType<typeof createFakeBrowserClient>;
beforeEach(async () => {
  userCount += 1;
  server = createFakeBrowserClient(`user-${userCount}`);
  vi.mocked(createSupabaseBrowserClient).mockReturnValue(
    server.client as never,
  );
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  // 대부분의 테스트는 "이미 한 번 받아 본 기기"에서 시작한다 (처음 방문은 아래 describe에서 따로)
  await markPulledBefore();
});

// 한 번 동기화한 기기로 만든다: 커서가 있으면 처음 방문(서버에서 기간 바로 받기)으로 가지 않는다
async function markPulledBefore() {
  await openLocalDb(`user-${userCount}`).meta.put({
    table: 'records',
    cursor: { updatedAt: '2000-01-01T00:00:00.000Z', id: NIL_UUID },
  });
}
afterEach(() => {
  closeLocalDb();
  vi.restoreAllMocks();
});

// 첫 조회의 동기화가 받을 서버 줄 (전체)
function serverHas(...rows: RecordRow[]) {
  server.respond({ data: rows, error: null });
}

describe('조회: 서버의 바뀐 줄을 받아 기기 사본에서 읽는다', () => {
  it('기간 안의 기록을 날짜 → 만든 순서로, 지운 기록은 빼고', async () => {
    serverHas(
      row({ id: 'late', occurred_at: '2026-10-20' }),
      row({ id: 'early', occurred_at: '2026-10-05' }),
      row({ id: 'gone', deleted_at: '2026-10-22T00:00:00Z' }),
      row({ id: 'november', occurred_at: '2026-11-01' }),
    );
    const entries = await listRecords('2026-10-01', '2026-10-31');
    expect(entries.map((e) => nameOf(e.id))).toEqual(['early', 'late']);
  });

  // 25a 실험: 오프라인이면 화면이 회색 자리에 멈췄다. 이제는 사본으로 바로 그린다
  it('동기화가 실패해도(오프라인) 사본에 있는 것으로 답한다', async () => {
    serverHas(row({ id: 'a' }));
    await listRecords('2026-10-01', '2026-10-31');

    // 시각만 앞으로 (5초 건너뛰기를 넘기려고). 타이머까지 멈추면 fake-indexeddb 내부가 멈춘다
    vi.useFakeTimers({ now: Date.now() + 10_000, toFake: ['Date'] });
    server.failNext();
    const entries = await listRecords('2026-10-01', '2026-10-31');
    vi.useRealTimers();
    expect(entries.map((e) => nameOf(e.id))).toEqual(['a']);
  });

  it('최근 기록: 최신 날짜부터 limit개, 루틴 체크는 뺀다', async () => {
    serverHas(
      row({ id: 'old', occurred_at: '2026-10-01' }),
      row({
        id: 'check',
        type: 'routine',
        occurred_at: '2026-10-21',
        title: '물 마시기',
        fields: {
          routineId: '11111111-1111-4111-8111-111111111111',
          count: 1,
          target: 1,
          unit: '',
        },
      }),
      row({ id: 'new', occurred_at: '2026-10-20' }),
      row({ id: 'newer', occurred_at: '2026-10-20' }),
    );
    const entries = await listRecentRecords(2);
    expect(entries.map((e) => nameOf(e.id))).toEqual(['newer', 'new']);
  });

  it('한 기록 보기: 사본에 없으면 null', async () => {
    serverHas(row({ id: 'a' }));
    expect(nameOf((await getRecord(uid('a')))!.id)).toBe('a');
    expect(await getRecord(uid('없음'))).toBeNull();
  });

  it('그 칸이 있는 최근 기록 (체중만, 허리둘레 기록은 건너뛴다)', async () => {
    serverHas(
      row({
        id: 'w1',
        type: 'body',
        occurred_at: '2026-10-10',
        title: '체중',
        fields: { weight: 69 },
      }),
      row({
        id: 'waist',
        type: 'body',
        occurred_at: '2026-10-20',
        title: '허리둘레',
        fields: { waist: 78 },
      }),
      row({
        id: 'w2',
        type: 'body',
        occurred_at: '2026-10-15',
        title: '체중',
        fields: { weight: 68.4 },
      }),
    );
    const entries = await listLatestRecordsWithField('body', 'weight', 2);
    expect(entries.map((e) => nameOf(e.id))).toEqual(['w2', 'w1']);
  });
});

describe('검색 (기기 사본)', () => {
  it('검색어·기간으로 찾고 정렬한다', async () => {
    serverHas(
      row({ id: 'coffee', title: '커피', occurred_at: '2026-10-10' }),
      row({
        id: 'cafe',
        title: '케이크',
        occurred_at: '2026-10-12',
        fields: { amount: 6000, category: '카페' },
      }),
      row({ id: 'sept', title: '커피', occurred_at: '2026-09-30' }),
    );
    const result = await searchRecords({
      keyword: '커피',
      sort: 'oldest',
      range: { from: '2026-10-01', to: '2026-10-31' },
    });
    expect(result.entries.map((e) => nameOf(e.id))).toEqual(['coffee']);

    const byCategory = await searchRecords({
      keyword: '카페',
      sort: 'latest',
      range: null,
    });
    expect(byCategory.entries.map((e) => nameOf(e.id))).toEqual(['cafe']);
  });

  it('한도를 넘으면 잘라 내고 알린다', async () => {
    serverHas(
      ...Array.from({ length: SEARCH_RESULT_LIMIT + 1 }, (_, i) =>
        row({ id: `r${i}` }),
      ),
    );
    const result = await searchRecords({
      keyword: '',
      sort: 'latest',
      range: null,
    });
    expect(result.entries).toHaveLength(SEARCH_RESULT_LIMIT);
    expect(result.isTruncated).toBe(true);
  });
});

describe('쓰기: 기기 사본에 먼저 쓰고 대기열에 쌓는다 (보내기는 recordOutbox)', () => {
  const LUNCH: NewRecordInput = {
    type: 'expense',
    occurredAt: '2026-10-21',
    title: '점심',
    memo: null,
    tags: [],
    fields: { amount: 9800, category: '식비' },
  };
  const db = () => openLocalDb(`user-${userCount}`);

  it('새 기록은 서버를 기다리지 않고 목록에 보이고, 대기열에 upsert로 쌓인다', async () => {
    serverHas();
    await listRecords('2026-10-01', '2026-10-31');

    const saved = await createRecord(LUNCH);

    const entries = await listRecords('2026-10-01', '2026-10-31');
    expect(entries.map((e) => e.title)).toEqual(['점심']);
    const ops = await db().outbox.toArray();
    expect(ops).toMatchObject([
      { kind: 'upsert', recordId: saved.id, row: { title: '점심' } },
    ]);
    expect(await listPendingRecordIds()).toEqual([saved.id]);
    // 서버에 바로 보내지 않는다 (보내기는 뒤에서)
    expect(server.calls.some((call) => call.method === 'insert')).toBe(false);
    expect(flushRecordOutbox).toHaveBeenCalled();
  });

  it('없는 기록은 고치지 않는다', async () => {
    const saved = await createRecord(LUNCH);
    await expect(updateRecord({ ...saved, id: uid('없음') })).rejects.toThrow(
      '수정할 기록이 없음',
    );
  });

  it('보내기 전에 지우고 되돌리면 대기열에서 삭제가 빠지고 기록이 그대로 돌아온다', async () => {
    const saved = await createRecord(LUNCH);
    await deleteRecord(saved.id);
    expect(await getRecord(saved.id)).toBeNull();

    await restoreRecord(saved.id);
    expect((await getRecord(saved.id))?.title).toBe('점심');
    expect((await db().outbox.toArray()).map((op) => op.kind)).toEqual([
      'upsert',
    ]);
  });

  it('이미 보낸 삭제를 되돌리면 되살리기를 쌓는다', async () => {
    const saved = await createRecord(LUNCH);
    await deleteRecord(saved.id);
    // 보내기가 끝난 상태를 흉내: 대기열을 비운다
    await db().outbox.clear();

    await restoreRecord(saved.id);
    expect((await getRecord(saved.id))?.title).toBe('점심');
    expect((await db().outbox.toArray()).map((op) => op.kind)).toEqual([
      'restore',
    ]);
  });

  // 거짓으로 "되돌렸어요"라고 하지 않는다
  it('되돌릴 줄을 모르면 실패로 알린다', async () => {
    await expect(restoreRecord(uid('모름'))).rejects.toThrow(
      '되돌릴 기록이 없음',
    );
  });

  it('루틴 체크: 사본에서 그날 줄을 찾아 만들고 → 고치고 → 0이면 지운다 (오프라인에서도)', async () => {
    const check = {
      routineId: '11111111-1111-4111-8111-111111111111',
      routineName: '물 마시기',
      date: '2026-10-21',
      target: 8,
      unit: '잔',
    };
    await setRoutineCheck({ ...check, count: 1 });
    await setRoutineCheck({ ...check, count: 2 });
    const rows = await db().records.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].fields).toMatchObject({ count: 2 });

    await setRoutineCheck({ ...check, count: 0 });
    expect(await db().records.count()).toBe(0);
  });

  it('보내지 않은 변경이 있는 기록은 동기화가 서버의 예전 내용으로 덮어쓰지 않는다', async () => {
    const lunch = row({ id: 'lunch', title: '점심' });
    serverHas(lunch);
    await listRecords('2026-10-01', '2026-10-31');
    const [entry] = await listRecords('2026-10-01', '2026-10-31');
    await updateRecord({ ...entry, title: '점심(고침)' });

    // 5초 뒤 다시 동기화: 서버는 아직 예전 제목을 준다
    vi.useFakeTimers({ now: Date.now() + 10_000, toFake: ['Date'] });
    serverHas({ ...lunch, updated_at: '2026-10-22T09:00:00.000Z' });
    const entries = await listRecords('2026-10-01', '2026-10-31');
    vi.useRealTimers();
    expect(entries.map((e) => e.title)).toEqual(['점심(고침)']);
  });

  it('체험하기 예시 기록은 요청 하나로 서버에 바로 넣는다 (각자 새 id, DB 칸 이름)', async () => {
    const inputs = buildSampleRecords('2026-10-21');
    server.respond({ data: [], error: null });

    await createRecords(inputs);

    const inserts = server.calls.filter((call) => call.method === 'insert');
    expect(inserts).toHaveLength(1);
    const rows = inserts[0].args[0] as { id: string; occurred_at: string }[];
    expect(rows).toHaveLength(inputs.length);
    expect(new Set(rows.map((r) => r.id)).size).toBe(inputs.length);
  });

  // 하나라도 스키마에 어긋나면 아무것도 보내지 않는다 (일부만 들어가지 않게)
  it('검사에 실패한 예시 기록이 있으면 보내지 않고 던진다', async () => {
    const [valid] = buildSampleRecords('2026-10-21');
    const invalid = { ...valid, title: '' } as NewRecordInput;

    await expect(createRecords([valid, invalid])).rejects.toThrow();
    expect(server.calls.some((call) => call.method === 'insert')).toBe(false);
  });

  it('스키마에 어긋난 기록은 사본에도 대기열에도 넣지 않는다', async () => {
    await expect(createRecord({ ...LUNCH, title: '' })).rejects.toThrow();
    expect(await db().outbox.count()).toBe(0);
  });
});

describe('처음 방문 (이 기기에 사본이 아직 없음)', () => {
  beforeEach(async () => {
    await openLocalDb(`user-${userCount}`).meta.clear();
  });

  // 26단계: 전체 동기화(기록이 많으면 오래 걸림)를 기다리지 않고 보는 기간만 바로 받는다
  it('보는 기간은 서버에서 바로 받고, 전체 동기화는 뒤에서 해 사본을 채운다', async () => {
    const lunch = row({ id: 'lunch', title: '점심' });
    // 기간 조회와 뒤의 전체 동기화가 같은 줄을 받는다 (두 요청의 순서는 정해져 있지 않다)
    server.respond(
      { data: [lunch], error: null },
      { data: [lunch], error: null },
    );

    const entries = await listRecords('2026-10-01', '2026-10-31');
    expect(entries.map((e) => e.title)).toEqual(['점심']);
    expect(server.calls.some((call) => call.method === 'gte')).toBe(true);

    const db = openLocalDb(`user-${userCount}`);
    await vi.waitFor(async () =>
      expect(await hasPulledOnce(db, 'records')).toBe(true),
    );
    expect(await db.records.count()).toBe(1);
  });

  // 31단계 E2E로 찾은 것: 예전에는 빈 사본을 읽어 "기록 없음"으로 보였다
  it('서버 조회와 동기화가 모두 실패하면 빈 목록이 아니라 오류', async () => {
    server.failNext();
    server.failNext();
    await expect(listRecords('2026-10-01', '2026-10-31')).rejects.toThrow();
  });

  it('오프라인이면 서버에 묻지 않고 사본(아직 빈 목록)으로', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const entries = await listRecords('2026-10-01', '2026-10-31');
    vi.unstubAllGlobals();
    expect(entries).toEqual([]);
    expect(server.calls).toEqual([]);
  });
});
