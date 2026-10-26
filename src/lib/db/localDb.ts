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
  // 이 커서를 처음 저장한 기기 시각(ms). 겹쳐 받기를 언제 멈춰도 되는지 재는 데만 쓴다 (sync.ts pullChanges).
  // 예전 사본에는 없다 → 처음 다시 받을 때 그 시각으로 채운다
  cursorSeenAt?: number;
  // 커서가 생기고 겹침 시간이 지난 뒤 겹쳐 받기를 한 번 마쳤다 = 커서 앞에서 늦게 끝날 저장이 더는 없다.
  // true면 다음부터 커서 바로 뒤부터 받는다. 커서가 앞으로 가면 다시 false (2026-10-24, 41 1만 건 성능)
  settled?: boolean;
};

// 서버에 보낼 기록 내용 (DB 칸 이름). user_id·시각 칸은 서버가 붙인다
export type OutboxRecordRow = Pick<
  LocalRecordRow,
  'id' | 'type' | 'occurred_at' | 'title' | 'memo' | 'tags' | 'fields'
>;

// 아직 서버에 보내지 않은 기록 변경 하나 (25c, 오프라인 작성 대기열).
// seq(자동 증가) 순서대로 보낸다: 같은 기록을 만들고 → 고치고 → 지운 순서가 서버에서도 지켜져야 한다
export type OutboxOp = {
  seq?: number;
  recordId: string;
  queuedAt: string;
  // 서버가 거절한 이유. 있으면 자동으로 다시 보내지 않고 "다시 시도"를 기다린다 (네트워크 실패는 적지 않는다)
  failure?: string;
} & (
  | { kind: 'upsert'; row: OutboxRecordRow }
  // 지우기 전 줄을 들고 있다: 보내기 전에 되돌리면 이 줄을 사본에 다시 넣는다
  | { kind: 'delete'; deletedAt: string; previous: LocalRecordRow }
  | { kind: 'restore' }
);

// 설정(숨긴 타입)의 사본. 한 계정에 한 줄이라 키는 늘 'user'
export type LocalSettings = { key: 'user'; hiddenTypes: string[] };

// 예산의 사본 (step3). 한 달에 한 줄이라 키는 달('YYYY-MM'). 오프라인에서도 가계부 요약의 예산이 보이게
export type LocalBudget = {
  month: string;
  total: number | null;
  categories: Record<string, number>;
};

// 고정지출의 사본 (step3). 서버 목록을 통째로 바꿔 담는다(몇 개뿐이라 커서 동기화가 필요 없다). 오프라인에서도 목록이 보이게
export type LocalFixedExpense = {
  id: string;
  name: string;
  amount: number;
  category: string;
  paymentMethod?: string;
  schedule: { kind: 'monthly'; day: number };
  startDate: string;
  lastRecordedOn: string | null;
};

// 커서 없이 받는 사본(고정지출, 예산)을 "한 번이라도 받았는지". 빈 사본이 "없음"인지 "아직 못 받음"인지 가린다.
// 계정마다 다른 데이터베이스 안에 두어 계정을 바꿔도 섞이지 않는다 (localStorage였다면 계정끼리 공유된다)
export type PullMark = { name: string; pulledAt: string };

// 나키 대화 한 턴 (2026-10-26 사용자 결정: 이 기기에만, 최근 50개). 답을 받은 것만 둔다.
// 결과(합계·기록)는 두지 않고 조건만: 다시 열 때 지금 기기 사본으로 다시 계산한다 (기록을 고쳤으면 고친 대로)
export type LocalNakiTurn = {
  seq?: number;
  question: string;
  // 나키 API 응답 그대로(서버가 거른 조건). 모양 검사는 읽는 쪽(nakiHistoryStore)이 Zod로 한다
  state: unknown;
  aggregate: unknown;
  compare: unknown;
  askedAt: string;
};

export class LocalDb extends Dexie {
  records!: Table<LocalRecordRow, string>;
  routines!: Table<LocalRoutineRow, string>;
  meta!: Table<SyncMeta, SyncedTable>;
  outbox!: Table<OutboxOp, number>;
  settings!: Table<LocalSettings, 'user'>;
  budgets!: Table<LocalBudget, string>;
  fixedExpenses!: Table<LocalFixedExpense, string>;
  pulls!: Table<PullMark, string>;
  nakiTurns!: Table<LocalNakiTurn, number>;

  constructor(
    name: string,
    // 사본 주인. 기기에서 만든 줄의 user_id로 쓴다 (서버로는 보내지 않는다)
    readonly userId: string,
  ) {
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
    // 2: 오프라인 작성 대기열 (25c). ++seq = 자동 증가 기본 키(보낼 순서), recordId = 그 기록의 대기 중 변경 찾기
    this.version(2).stores({
      outbox: '++seq, recordId',
    });
    // 3: 설정 사본 (25c-2). 오프라인에서 새로 고쳐도 숨긴 타입이 숨겨진 채로 보이게
    this.version(3).stores({
      settings: 'key',
    });
    // 4: 예산 사본 (step3). 키가 달이라 "이 달 이전 중 가장 최근"을 키 순서로 바로 찾는다 (where(':id').belowOrEqual)
    this.version(4).stores({
      budgets: 'month',
    });
    // 5: 고정지출 사본 (step3). 늘 전체를 읽어서 색인은 기본 키만. pulls = 통째로 받는 사본의 "받았음" 표시
    this.version(5).stores({
      fixedExpenses: 'id',
      pulls: 'name',
    });
    // 6: 나키 대화 (2026-10-26). ++seq = 물은 순서. 계정마다 다른 데이터베이스라 로그아웃 때 사본과 함께 지워진다 (deviceData)
    this.version(6).stores({
      nakiTurns: '++seq',
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
  opened = { userId, db: new LocalDb(localDbName(userId), userId) };
  return opened.db;
}

// 테스트에서 계정마다 새 데이터베이스로 시작하려고 쓴다
export function closeLocalDb(): void {
  opened?.db.close();
  opened = null;
}
