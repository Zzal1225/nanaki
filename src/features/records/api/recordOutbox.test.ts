import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  closeLocalDb,
  openLocalDb,
  type LocalDb,
  type LocalRecordRow,
  type OutboxRecordRow,
} from '@/lib/db/localDb';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { createFakeBrowserClient } from '@/lib/supabase/fakeBrowserClient.testing';
import {
  flushRecordOutbox,
  hasFailedRecords,
  isServerRejection,
  pendingRecordIds,
  retryFailedRecords,
} from './recordOutbox';

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const WINNER = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ROUTINE = '11111111-1111-4111-8111-111111111111';

function outboxRow(id: string, title: string): OutboxRecordRow {
  return {
    id,
    type: 'expense',
    occurred_at: '2026-10-21',
    title,
    memo: null,
    tags: [],
    fields: { amount: 1000, category: '식비' },
  };
}

// 서버가 돌려주는 줄 (시각 칸은 서버가 붙인 값)
function serverRow(row: OutboxRecordRow, extra: Partial<LocalRecordRow> = {}) {
  return {
    ...row,
    user_id: 'u',
    created_at: '2026-10-22T01:00:00.000+00:00',
    updated_at: '2026-10-22T01:00:00.000+00:00',
    deleted_at: null,
    ...extra,
  };
}

let count = 0;
let db: LocalDb;
let server: ReturnType<typeof createFakeBrowserClient>;

beforeEach(() => {
  count += 1;
  db = openLocalDb(`outbox-${count}`);
  server = createFakeBrowserClient(`outbox-${count}`);
  vi.mocked(createSupabaseBrowserClient).mockReturnValue(
    server.client as never,
  );
});
afterEach(() => closeLocalDb());

async function queueUpsert(row: OutboxRecordRow) {
  await db.records.put(serverRow(row, { created_at: 'local' }));
  await db.outbox.add({
    kind: 'upsert',
    recordId: row.id,
    row,
    queuedAt: new Date().toISOString(),
  });
}

describe('서버 거절과 닿지 못함 구분', () => {
  it('PostgREST 오류 코드가 있으면 거절, 없으면(네트워크) 닿지 못함', () => {
    expect(isServerRejection({ code: '23514', message: '검사 위반' })).toBe(
      true,
    );
    expect(isServerRejection({ code: '', message: 'Failed to fetch' })).toBe(
      false,
    );
    expect(isServerRejection(new TypeError('Failed to fetch'))).toBe(false);
  });
});

describe('보내기', () => {
  it('id 기준 upsert로 보내고, 대기열에서 빼고, 서버가 돌려준 줄로 사본을 맞춘다', async () => {
    const lunch = outboxRow(A, '점심');
    await queueUpsert(lunch);
    server.respond({ data: [serverRow(lunch)], error: null });

    expect(await flushRecordOutbox(db)).toBe('done');

    const upsert = server.calls.find((call) => call.method === 'upsert');
    expect(upsert?.args).toEqual([lunch, { onConflict: 'id' }]);
    expect(await db.outbox.count()).toBe(0);
    expect((await db.records.get(A))?.created_at).toBe(
      '2026-10-22T01:00:00.000+00:00',
    );
  });

  // 오프라인: 뒤의 변경도 어차피 못 가고, 순서가 뒤바뀌면 안 된다
  it('닿지 못하면 거기서 멈추고 대기열을 그대로 둔다', async () => {
    await queueUpsert(outboxRow(A, '점심'));
    await queueUpsert(outboxRow(B, '저녁'));
    server.respond({
      data: null,
      error: { code: '', message: 'Failed to fetch' },
    });

    expect(await flushRecordOutbox(db)).toBe('offline');
    expect(await db.outbox.count()).toBe(2);
    expect(
      server.calls.filter((call) => call.method === 'upsert'),
    ).toHaveLength(1);
  });

  it('서버가 거절한 기록은 이유를 적고 멈추고, 다른 기록은 계속 보낸다', async () => {
    const bad = outboxRow(A, '거절될 기록');
    const good = outboxRow(B, '저녁');
    await queueUpsert(bad);
    await queueUpsert(good);
    server.respond(
      { data: null, error: { code: '23514', message: '검사 위반' } },
      { data: [serverRow(good)], error: null },
    );

    expect(await flushRecordOutbox(db)).toBe('done');
    const left = await db.outbox.toArray();
    expect(left).toHaveLength(1);
    expect(left[0]).toMatchObject({ recordId: A, failure: '검사 위반' });
    expect(await hasFailedRecords(db)).toBe(true);
    expect(await pendingRecordIds(db)).toEqual(new Set([A]));
  });

  it('다시 시도: 거절 표시를 지우고 다시 보낸다', async () => {
    const lunch = outboxRow(A, '점심');
    await queueUpsert(lunch);
    await db.outbox.toCollection().modify({ failure: '검사 위반' });
    server.respond({ data: [serverRow(lunch)], error: null });

    await retryFailedRecords(db);
    expect(await db.outbox.count()).toBe(0);
  });

  // 서버가 돌려준 건 "이 변경까지"의 모습이라, 기기에서 이미 더 고친 내용을 되돌리면 안 된다
  it('같은 기록에 보낼 변경이 남아 있으면 중간 결과로 사본을 덮지 않는다', async () => {
    const first = outboxRow(A, '첫 제목');
    await queueUpsert(first);
    await queueUpsert(outboxRow(A, '나중 제목'));
    server.respond(
      { data: [serverRow(first)], error: null },
      {
        data: [serverRow(outboxRow(A, '나중 제목'))],
        error: null,
      },
    );

    await flushRecordOutbox(db);
    expect((await db.records.get(A))?.title).toBe('나중 제목');
  });

  it('루틴 체크가 다른 기기의 같은 날 체크와 부딪히면(23505) 먼저 생긴 줄로 합친다', async () => {
    const mine: OutboxRecordRow = {
      id: A,
      type: 'routine',
      occurred_at: '2026-10-21',
      title: '물 마시기',
      memo: null,
      tags: [],
      fields: { routineId: ROUTINE, count: 3, target: 8, unit: '잔' },
    };
    await queueUpsert(mine);
    server.respond(
      { data: null, error: { code: '23505', message: '중복' } },
      { data: { id: WINNER }, error: null },
      { data: [serverRow({ ...mine, id: WINNER })], error: null },
    );

    expect(await flushRecordOutbox(db)).toBe('done');
    const upserts = server.calls.filter((call) => call.method === 'upsert');
    expect((upserts[1].args[0] as OutboxRecordRow).id).toBe(WINNER);
    expect(await db.records.get(A)).toBeUndefined();
    expect((await db.records.get(WINNER))?.fields).toMatchObject({ count: 3 });
  });

  it('지우기는 deleted_at을 보내고 사본에서 뺀 채로 둔다', async () => {
    const lunch = outboxRow(A, '점심');
    const previous = serverRow(lunch);
    await db.outbox.add({
      kind: 'delete',
      recordId: A,
      deletedAt: '2026-10-22T02:00:00.000Z',
      previous,
      queuedAt: new Date().toISOString(),
    });
    server.respond({
      data: [{ ...previous, deleted_at: '2026-10-22T02:00:00.000Z' }],
      error: null,
    });

    await flushRecordOutbox(db);
    const update = server.calls.find((call) => call.method === 'update');
    expect(update?.args[0]).toEqual({ deleted_at: '2026-10-22T02:00:00.000Z' });
    expect(await db.records.get(A)).toBeUndefined();
  });

  // 같은 변경을 두 번 보내지 않게: 연달아 저장하면 보내기가 겹쳐 불린다
  it('보내는 중에 또 불러도 한 줄기로 돈다 (같은 변경을 두 번 보내지 않는다)', async () => {
    const lunch = outboxRow(A, '점심');
    await queueUpsert(lunch);
    server.respond({ data: [serverRow(lunch)], error: null });

    const first = flushRecordOutbox(db);
    const second = flushRecordOutbox(db);
    expect(second).toBe(first);
    await first;
    expect(
      server.calls.filter((call) => call.method === 'upsert'),
    ).toHaveLength(1);
    expect(await db.outbox.count()).toBe(0);
  });
});
