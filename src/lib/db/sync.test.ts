import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { closeLocalDb, openLocalDb, type LocalRecordRow } from './localDb';
import {
  compareCursor,
  createTableSync,
  hasPulledOnce,
  NIL_UUID,
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
  it('겹쳐 받기: 60초 앞, id는 가장 작은 UUID로 그 시각의 줄을 모두 다시 받는다', () => {
    const rewound = rewindCursor({
      updatedAt: '2026-10-22T01:00:00.000Z',
      id: 'x',
    });
    expect(rewound).toEqual({
      updatedAt: new Date(
        Date.parse('2026-10-22T01:00:00.000Z') - SYNC_OVERLAP_MS,
      ).toISOString(),
      id: NIL_UUID,
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

  // 커서가 없으면 화면이 매번 "처음 방문"으로 보고 서버에서 직접 읽는다 (recordStore)
  it('받을 줄이 하나도 없어도(새 계정) 한 번 받아 봤다는 표시를 남긴다', async () => {
    const db = freshDb();
    expect(await hasPulledOnce(db, 'records')).toBe(false);
    await pullChanges({
      db,
      table: 'records',
      target: db.records,
      fetchChanges: serverOf([]),
      isRemoved: () => false,
    });
    expect(await hasPulledOnce(db, 'records')).toBe(true);
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

  // 1만 건 측정에서 찾음: 한꺼번에 넣은 줄이 겹침 60초 안에 모여 있으면 화면을 열 때마다 전부 다시 받았다
  describe('겹쳐 받기 확정', () => {
    const T = '2026-10-22T01:00:00.000Z';
    const pull = (
      db: ReturnType<typeof freshDb>,
      fetchChanges: ReturnType<typeof serverOf>,
      at: number,
    ) =>
      pullChanges({
        db,
        table: 'records',
        target: db.records,
        fetchChanges,
        isRemoved: () => false,
        now: () => at,
      });

    it('커서를 본 지 60초가 지나 시작한 겹쳐 받기를 마치면, 다음부터는 커서 바로 뒤부터 받는다', async () => {
      const db = freshDb();
      const fetchChanges = serverOf([row('a', T), row('b', T)]);
      const seen = 1_000_000;

      await pull(db, fetchChanges, seen);
      // 60초 안: 아직 겹쳐 받는다 (늦게 끝나는 저장을 기다리는 중)
      await pull(db, fetchChanges, seen + SYNC_OVERLAP_MS - 1);
      expect(fetchChanges).toHaveBeenLastCalledWith(
        rewindCursor({ updatedAt: T, id: 'b' }),
        SYNC_PAGE_SIZE,
      );
      expect((await db.meta.get('records'))?.settled).toBe(false);
      // 60초 뒤: 한 번 더 겹쳐 받고 확정
      await pull(db, fetchChanges, seen + SYNC_OVERLAP_MS);
      expect(fetchChanges).toHaveBeenLastCalledWith(
        rewindCursor({ updatedAt: T, id: 'b' }),
        SYNC_PAGE_SIZE,
      );
      expect((await db.meta.get('records'))?.settled).toBe(true);
      // 확정 뒤: 다시 받는 줄이 없다
      await pull(db, fetchChanges, seen + 2 * SYNC_OVERLAP_MS);
      expect(fetchChanges).toHaveBeenLastCalledWith(
        { updatedAt: T, id: 'b' },
        SYNC_PAGE_SIZE,
      );
    });

    it('확정 뒤 새 줄이 와서 커서가 앞으로 가면, 새 커서는 다시 겹쳐 받기부터', async () => {
      const db = freshDb();
      const T2 = '2026-10-22T02:00:00.000Z';
      const server = [row('a', T)];
      const fetchChanges = serverOf(server);
      await db.meta.put({
        table: 'records',
        cursor: { updatedAt: T, id: 'a' },
        cursorSeenAt: 0,
        settled: true,
      });

      server.push(row('c', T2));
      const later = serverOf(server);
      await pull(db, later, 5_000_000);
      expect(await db.meta.get('records')).toMatchObject({
        cursor: { updatedAt: T2, id: 'c' },
        cursorSeenAt: 5_000_000,
        settled: false,
      });
      await pull(db, later, 5_000_001);
      expect(later).toHaveBeenLastCalledWith(
        rewindCursor({ updatedAt: T2, id: 'c' }),
        SYNC_PAGE_SIZE,
      );
      expect(fetchChanges).not.toHaveBeenCalled();
    });

    it('늦게 끝난 저장(커서보다 앞선 시각)은 확정 전 겹쳐 받기가 가져온다', async () => {
      const db = freshDb();
      const server = [row('b', T)];
      const fetchChanges = serverOf(server);
      await pull(db, fetchChanges, 0);

      // 커서(T, b)보다 10초 앞선 시각으로, 커서를 받은 뒤에야 보이게 된 줄
      server.push(row('late', '2026-10-22T00:59:50.000Z'));
      const withLate = serverOf(server);
      await pull(db, withLate, SYNC_OVERLAP_MS);
      expect(await db.records.get('late')).toBeDefined();
      expect((await db.meta.get('records'))?.settled).toBe(true);
    });

    it('예전 사본(본 시각 없음)은 지금 본 것으로 치고, 60초 뒤에 확정한다', async () => {
      const db = freshDb();
      await db.meta.put({
        table: 'records',
        cursor: { updatedAt: T, id: 'a' },
      });
      const fetchChanges = serverOf([row('a', T)]);

      await pull(db, fetchChanges, 7_000);
      expect(await db.meta.get('records')).toMatchObject({
        cursorSeenAt: 7_000,
        settled: false,
      });
      await pull(db, fetchChanges, 7_000 + SYNC_OVERLAP_MS);
      expect((await db.meta.get('records'))?.settled).toBe(true);
    });
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
