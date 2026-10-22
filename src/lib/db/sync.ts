import type { Table } from 'dexie';
import type { LocalDb, SyncCursor, SyncedTable } from './localDb';

// 서버 → 기기 사본 "바뀐 것만 받기" (README 4: 다른 기기의 변경은 마지막으로 받은 시각 이후 바뀐 기록만 가져온다).
// 서버가 붙이는 updated_at(트리거)과 id를 커서로 쓴다. 기기 시계는 틀릴 수 있어서 쓰지 않는다

// 한 번에 받는 줄 수. 처음 받을 때(기록 전체)도 이만큼씩 나눠 받아 요청 하나가 너무 커지지 않게
export const SYNC_PAGE_SIZE = 1000;

// 커서보다 이만큼 앞부터 다시 받는다. updated_at은 트랜잭션이 시작된 시각(now())이라,
// 먼저 시작해 늦게 끝난 저장은 이미 지나간 커서보다 앞선 시각으로 나타난다 → 잠깐 겹쳐 받아 놓치지 않는다.
// 겹쳐 받은 줄은 같은 id로 덮어쓰기라(bulkPut) 두 번 받아도 해가 없다
export const SYNC_OVERLAP_MS = 60_000;

// 이 시간 안에 다시 부르면 건너뛴다. 한 화면이 조회 여러 개를 한꺼번에 부르고(캘린더·카드·최근 기록),
// 화면을 옮길 때마다 또 부르므로, 매번 서버에 묻지 않게
export const SYNC_MIN_INTERVAL_MS = 5_000;

export type SyncedRow = { id: string; updated_at: string };

// after보다 뒤의 줄을 (updated_at, id) 순서로 limit개. after가 null이면 처음부터
export type FetchChanges<Row> = (
  after: SyncCursor | null,
  limit: number,
) => Promise<Row[]>;

// 같은 형식(서버가 준 ISO 문자열)끼리는 글자 비교가 시각 비교와 같다
export function compareCursor(a: SyncCursor, b: SyncCursor): number {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

// 가장 작은 UUID. 겹쳐 받기에서 "그 시각의 줄 모두"를 뜻하는 id로 쓴다.
// 빈 글자('')를 쓰면 안 된다: id 칸이 uuid 타입이라 서버가 id.gt."" 를 읽지 못해 400(22P02)을 돌려준다
// (첫 동기화 뒤 모든 동기화가 실패했다 — 단위 테스트는 가짜 서버라 못 잡고, E2E가 잡았다)
export const NIL_UUID = '00000000-0000-0000-0000-000000000000';

// 겹쳐 받기 시작점. id를 가장 작은 UUID로 두어 그 시각의 줄을 모두 다시 받는다
export function rewindCursor(cursor: SyncCursor | null): SyncCursor | null {
  if (!cursor) return null;
  return {
    updatedAt: new Date(
      Date.parse(cursor.updatedAt) - SYNC_OVERLAP_MS,
    ).toISOString(),
    id: NIL_UUID,
  };
}

// PostgREST or 필터: (updated_at > t) 또는 (updated_at = t 이고 id > i).
// updated_at만으로 자르면 같은 시각의 줄(한 번에 넣은 예시 기록 12개는 updated_at이 같다)이 페이지 경계에서 빠진다.
// 시각에 : + . 이 들어 있어서 값을 큰따옴표로 감싼다 (PostgREST 예약 글자)
export function toAfterCursorFilter(after: SyncCursor): string {
  const time = `"${after.updatedAt}"`;
  const id = `"${after.id}"`;
  return `updated_at.gt.${time},and(updated_at.eq.${time},id.gt.${id})`;
}

type PullOptions<Row extends SyncedRow> = {
  db: LocalDb;
  table: SyncedTable;
  target: Table<Row, string>;
  fetchChanges: FetchChanges<Row>;
  // 사본에서 뺄 줄인지 (지운 기록). 빼 두면 조회마다 deleted_at을 거를 필요가 없다
  isRemoved: (row: Row) => boolean;
};

// 바뀐 줄을 모두 받아 사본에 반영한다. 페이지마다 줄 반영과 커서 저장을 한 트랜잭션으로 묶는다:
// 중간에 끊겨도(창을 닫음) 커서가 반영된 줄까지만 앞으로 가서, 다음에 그 뒤부터 이어 받는다
export async function pullChanges<Row extends SyncedRow>({
  db,
  table,
  target,
  fetchChanges,
  isRemoved,
}: PullOptions<Row>): Promise<void> {
  let newest = (await db.meta.get(table))?.cursor ?? null;
  let after = rewindCursor(newest);

  for (;;) {
    const rows = await fetchChanges(after, SYNC_PAGE_SIZE);
    if (rows.length === 0) return;

    const last = rows[rows.length - 1];
    const lastCursor = { updatedAt: last.updated_at, id: last.id };
    // 겹쳐 받은 줄만 왔으면 커서를 뒤로 돌리지 않는다 (돌리면 다음번에 겹치는 구간이 점점 넓어진다)
    if (!newest || compareCursor(lastCursor, newest) > 0) newest = lastCursor;
    const cursor = newest;

    await db.transaction('rw', target, db.meta, async () => {
      await target.bulkPut(rows.filter((row) => !isRemoved(row)));
      await target.bulkDelete(
        rows.filter((row) => isRemoved(row)).map((row) => row.id),
      );
      await db.meta.put({ table, cursor });
    });

    if (rows.length < SYNC_PAGE_SIZE) return;
    after = lastCursor;
  }
}

// 표 하나의 동기화를 "한 번에 하나 + 5초에 한 번"으로 감싼다.
// 화면이 조회를 여럿 동시에 불러도 서버 요청은 한 줄기만 가고, 모두 같은 결과를 기다린다
export function createTableSync(
  pull: (db: LocalDb) => Promise<void>,
): (db: LocalDb) => Promise<void> {
  const running = new Map<string, Promise<void>>();
  const lastDoneAt = new Map<string, number>();

  return (db) => {
    const inFlight = running.get(db.name);
    if (inFlight) return inFlight;
    if (Date.now() - (lastDoneAt.get(db.name) ?? 0) < SYNC_MIN_INTERVAL_MS) {
      return Promise.resolve();
    }
    const job = pull(db)
      .then(() => {
        lastDoneAt.set(db.name, Date.now());
      })
      .finally(() => running.delete(db.name));
    running.set(db.name, job);
    return job;
  };
}
