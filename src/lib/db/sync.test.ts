import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { closeLocalDb, openLocalDb, type LocalRecordRow } from './localDb';
import {
  compareCursor,
  createTableSync,
  pullChanges,
  rewindCursor,
  SYNC_MIN_INTERVAL_MS,
  SYNC_OVERLAP_MS,
  SYNC_PAGE_SIZE,
  toAfterCursorFilter,
} from './sync';

function row(
  id: string,
  updatedAt: string,
  extra: Partial<LocalRecordRow> = {},
): LocalRecordRow {
  return {
    id,
    user_id: 'u',
    type: 'expense',
    occurred_at: '2026-10-21',
    title: id,
    memo: null,
    tags: [],
    fields: { amount: 1000, category: '식비' },
    created_at: updatedAt,
    updated_at: updatedAt,
    deleted_at: null,
    ...extra,
  };
}

// 서버 흉내: 받은 커서보다 뒤의 줄을 (updated_at, id) 순서로 limit개 준다
function serverOf(rows: LocalRecordRow[]) {
  const sorted = [...rows].sort((a, b) =>
    compareCursor(
      { updatedAt: a.updated_at, id: a.id },
      { updatedAt: b.updated_at, id: b.id },
    ),
  );
  return vi.fn(
    async (after: { updatedAt: string; id: string } | null, limit: number) =>
      sorted
        .filter(
          (r) =>
            !after ||
            compareCursor({ updatedAt: r.updated_at, id: r.id }, after) > 0,
        )
        .slice(0, limit),
  );
}

let dbCount = 0;
function freshDb() {
  dbCount += 1;
  return openLocalDb(`sync-test-${dbCount}`);
}

afterEach(() => closeLocalDb());

describe('커서', () => {
  it('(updated_at, id) 순서로 비교한다', () => {
    const a = { updatedAt: '2026-10-22T01:00:00.000000+00:00', id: 'a' };
    expect(compareCursor(a, { ...a, id: 'b' })).toBe(-1);
    expect(compareCursor(a, a)).toBe(0);
    expect(
      compareCursor({ ...a, updatedAt: '2026-10-22T02:00:00+00:00' }, a),
    ).toBe(1);
  });
  it('겹쳐 받기: 60초 앞, id는 비워 그 시각의 줄을 모두 다시 받는다', () => {
    const rewound = rewindCursor({
      updatedAt: '2026-10-22T01:00:00.000Z',
      id: 'x',
    });
    expect(rewound).toEqual({
      updatedAt: new Date(
        Date.parse('2026-10-22T01:00:00.000Z') - SYNC_OVERLAP_MS,
      ).toISOString(),
      id: '',
    });
    expect(rewindCursor(null)).toBeNull();
  });
  it('PostgREST 조건: 시각이 뒤이거나, 같은 시각이면 id가 뒤 (값은 따옴표로)', () => {
    expect(
      toAfterCursorFilter({ updatedAt: '2026-10-22T01:00:00+00:00', id: 'b' }),
    ).toBe(
      'updated_at.gt."2026-10-22T01:00:00+00:00",and(updated_at.eq."2026-10-22T01:00:00+00:00",id.gt."b")',
    );
  });
});

describe('바뀐 것만 받기', () => {
  it('처음에는 전부, 다음에는 커서(겹침 포함) 뒤만 받는다', async () => {
    const db = freshDb();
    const T1 = '2026-10-22T01:00:00.000Z';
    const server = [row('a', T1), row('b', T1)];
    const fetchChanges = serverOf(server);

    await pullChanges({
      db,
      table: 'records',
      target: db.records,
      fetchChanges,
      isRemoved: (r) => r.deleted_at !== null,
    });
    expect(fetchChanges).toHaveBeenLastCalledWith(null, SYNC_PAGE_SIZE);
    expect(await db.records.count()).toBe(2);
    expect((await db.meta.get('records'))?.cursor).toEqual({
      updatedAt: T1,
      id: 'b',
    });

    await pullChanges({
      db,
      table: 'records',
      target: db.records,
      fetchChanges,
      isRemoved: (r) => r.deleted_at !== null,
    });
    expect(fetchChanges).toHaveBeenLastCalledWith(
      rewindCursor({ updatedAt: T1, id: 'b' }),
      SYNC_PAGE_SIZE,
    );
  });

  it('지운 줄이 내려오면 사본에서 뺀다', async () => {
    const db = freshDb();
    await db.records.put(row('a', '2026-10-22T01:00:00.000Z'));
    const fetchChanges = serverOf([
      row('a', '2026-10-22T02:00:00.000Z', {
        deleted_at: '2026-10-22T02:00:00.000Z',
      }),
    ]);

    await pullChanges({
      db,
      table: 'records',
      target: db.records,
      fetchChanges,
      isRemoved: (r) => r.deleted_at !== null,
    });
    expect(await db.records.get('a')).toBeUndefined();
  });

  it('겹쳐 받은 줄만 오면 커서를 뒤로 돌리지 않는다', async () => {
    const db = freshDb();
    const newest = { updatedAt: '2026-10-22T01:00:30.000Z', id: 'z' };
    await db.meta.put({ table: 'records', cursor: newest });
    const fetchChanges = serverOf([row('old', '2026-10-22T01:00:10.000Z')]);

    await pullChanges({
      db,
      table: 'records',
      target: db.records,
      fetchChanges,
      isRemoved: () => false,
    });
    expect((await db.meta.get('records'))?.cursor).toEqual(newest);
  });

  it('한 페이지가 꽉 차면 다음 페이지를 이어 받는다 (같은 시각의 줄도 빠짐없이)', async () => {
    const db = freshDb();
    const T = '2026-10-22T01:00:00.000Z';
    // 페이지 크기 + 1개가 모두 같은 시각: id로 이어야 경계의 줄이 빠지지 않는다
    const server = Array.from({ length: SYNC_PAGE_SIZE + 1 }, (_, i) =>
      row(`r${String(i).padStart(5, '0')}`, T),
    );
    const fetchChanges = serverOf(server);

    await pullChanges({
      db,
      table: 'records',
      target: db.records,
      fetchChanges,
      isRemoved: () => false,
    });
    expect(fetchChanges).toHaveBeenCalledTimes(2);
    expect(await db.records.count()).toBe(SYNC_PAGE_SIZE + 1);
  });
});

describe('동기화 묶기', () => {
  it('동시에 여러 번 불러도 한 번만 돌고, 바로 다시 부르면 건너뛴다', async () => {
    const db = freshDb();
    const pull = vi.fn(async () => {});
    const sync = createTableSync(pull);

    await Promise.all([sync(db), sync(db), sync(db)]);
    expect(pull).toHaveBeenCalledTimes(1);
    await sync(db);
    expect(pull).toHaveBeenCalledTimes(1);

    vi.useFakeTimers({ now: Date.now() + SYNC_MIN_INTERVAL_MS + 1 });
    await sync(db);
    vi.useRealTimers();
    expect(pull).toHaveBeenCalledTimes(2);
  });

  it('실패하면 다음 부름에서 바로 다시 시도한다 (건너뛰지 않는다)', async () => {
    const db = freshDb();
    const pull = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('오프라인'))
      .mockResolvedValue();
    const sync = createTableSync(pull);

    await expect(sync(db)).rejects.toThrow('오프라인');
    await sync(db);
    expect(pull).toHaveBeenCalledTimes(2);
  });
});
