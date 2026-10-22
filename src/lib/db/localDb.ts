import Dexie, { type Table } from 'dexie';
import type { Tables } from '@/lib/supabase/database.types';

// 기기 사본(IndexedDB). 기준 데이터는 서버이고, 여기는 서버 줄을 그대로 베껴 둔 곳이다 (README 4. 오프라인 우선 동기화).
// 서버 줄 모양(snake_case) 그대로 담는다: 검증·변환(toRecordEntry, toRoutine)을 서버에서 받을 때와 똑같이 쓸 수 있고,
// 앱 값 모양이 바뀌어도 사본을 고쳐 쓸(마이그레이션) 필요가 없다

export type LocalRecordRow = Tables<'records'>;
export type LocalRoutineRow = Tables<'routines'>;

export type SyncedTable = 'records' | 'routines';

// 마지막으로 받은 줄의 (updated_at, id). 다음에는 이것보다 뒤의 줄만 받는다
export type SyncCursor = { updatedAt: string; id: string };

export type SyncMeta = {
  table: SyncedTable;
  cursor: SyncCursor;
};

export class LocalDb extends Dexie {
  records!: Table<LocalRecordRow, string>;
  routines!: Table<LocalRoutineRow, string>;
  meta!: Table<SyncMeta, SyncedTable>;

  constructor(name: string) {
    super(name);
    // 첫 칸이 기본 키, 나머지는 색인 (Dexie stores 문법).
    // - occurred_at: 달·기간 목록(홈 캘린더, 검색 기간)
    // - [type+occurred_at]: 타입 상세 (한 타입 · 한 달)
    // - [occurred_at+created_at+id]: 최근 기록 (서버 목록과 같은 정렬을 색인으로)
    // 지운 기록(deleted_at)은 사본에 두지 않아서 색인이 필요 없다 (sync.ts가 받는 순간 뺀다)
    this.version(1).stores({
      records:
        'id, occurred_at, [type+occurred_at], [occurred_at+created_at+id]',
      routines: 'id',
      meta: 'table',
    });
  }
}

// 계정마다 다른 데이터베이스: 한 기기에서 계정을 바꿔도 남의 사본이 섞이지 않는다
// (로그아웃 때 지우는 것은 25d. 그 전이라도 계정끼리는 갈라 둔다)
export function localDbName(userId: string): string {
  return `nanaki-${userId}`;
}

let opened: { userId: string; db: LocalDb } | null = null;

// 같은 계정이면 열어 둔 연결을 다시 쓴다. 계정이 바뀌면 이전 연결을 닫고 새로 연다
export function openLocalDb(userId: string): LocalDb {
  if (opened?.userId === userId) return opened.db;
  opened?.db.close();
  opened = { userId, db: new LocalDb(localDbName(userId)) };
  return opened.db;
}

// 테스트에서 계정마다 새 데이터베이스로 시작하려고 쓴다
export function closeLocalDb(): void {
  opened?.db.close();
  opened = null;
}
