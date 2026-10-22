import { LOCAL_DB_CHANGED_EVENT } from '@/lib/db/currentLocalDb';
import type { LocalDb, LocalRecordRow, OutboxOp } from '@/lib/db/localDb';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

// 오프라인 작성 대기열(outbox) 보내기 (25c). 기록 쓰기는 모두 기기 사본에 먼저 하고 여기에 쌓는다
// (2026-10-22 사용자 결정: 온라인이어도 항상 기기에 먼저 → 저장 버튼이 늘 바로 끝나고, 온·오프라인 동작이 같다).
// 보내기는 쌓인 순서대로, 같은 요청을 다시 보내도 중복이 생기지 않게 id 기준 upsert로 한다 (README 4)

// 요청 하나를 기다리는 최대 시간. 오프라인 흉내에서 요청이 실패도 끝도 안 나는 일이 있었다 (25b).
// 넘으면 네트워크 실패로 보고 다음 기회에 다시 보낸다
export const OUTBOX_REQUEST_TIMEOUT_MS = 15_000;

// 서버가 거절해 보내지 못한 기록이 생겼음을 알린다. OutboxSync가 듣고 "다시 시도" 토스트를 띄운다
export const OUTBOX_FAILED_EVENT = 'nanaki:outbox-failed';

// Postgres 고유 제약 위반 (records_routine_check_unique: 같은 루틴·같은 날 두 줄)
const UNIQUE_VIOLATION = '23505';

type ServerError = { code?: unknown; message?: unknown };

// 서버가 답한 거절(PostgREST 오류 코드가 있음)인지, 닿지 못한 것(네트워크·시간 초과)인지.
// 거절은 다시 보내도 같은 결과라 멈춰 두고, 닿지 못한 것은 연결되면 저절로 다시 보낸다
export function isServerRejection(error: unknown): boolean {
  const code = (error as ServerError | null)?.code;
  return typeof code === 'string' && code.length > 0;
}

function messageOf(error: unknown): string {
  const message = (error as ServerError | null)?.message;
  return typeof message === 'string' ? message : String(error);
}

// 대기 중인 변경이 있는 기록 id (목록의 구름 아이콘, 동기화가 덮어쓰지 않을 줄)
export async function pendingRecordIds(db: LocalDb): Promise<Set<string>> {
  const ops = await db.outbox.toArray();
  return new Set(ops.map((op) => op.recordId));
}

// 서버가 거절해 멈춰 있는 기록이 있는지
export async function hasFailedRecords(db: LocalDb): Promise<boolean> {
  return (await db.outbox.filter((op) => op.failure !== undefined).count()) > 0;
}

// 변경 하나를 서버에 보내고, 서버가 돌려준 줄을 준다 (사본을 서버 상태에 맞추려고)
async function send(op: OutboxOp): Promise<LocalRecordRow[]> {
  const supabase = createSupabaseBrowserClient();
  const signal = AbortSignal.timeout(OUTBOX_REQUEST_TIMEOUT_MS);

  if (op.kind === 'upsert') {
    // user_id·시각 칸은 보내지 않는다: user_id는 DB 기본값(auth.uid()), updated_at은 트리거가 붙인다.
    // 다른 기기에서 지운 기록이면 deleted_at을 보내지 않으므로 지운 채로 남는다 (지운 쪽이 이긴다)
    const { data, error } = await supabase
      .from('records')
      .upsert(op.row, { onConflict: 'id' })
      .select()
      .abortSignal(signal);
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('records')
    .update({ deleted_at: op.kind === 'delete' ? op.deletedAt : null })
    .eq('id', op.recordId)
    .select()
    .abortSignal(signal);
  if (error) throw error;
  return data;
}

// 루틴 체크가 고유 색인에 걸렸다: 다른 기기가 같은 루틴·같은 날을 먼저 체크했다.
// 먼저 생긴 줄(서버)에 내 횟수를 덮어쓰고, 기기의 내 줄은 그 줄로 바꾼다 (하루 한 줄 규칙)
async function mergeRoutineCheck(
  db: LocalDb,
  op: Extract<OutboxOp, { kind: 'upsert' }>,
): Promise<LocalRecordRow[]> {
  const supabase = createSupabaseBrowserClient();
  const fields = op.row.fields as { routineId?: string };
  const { data: winner, error } = await supabase
    .from('records')
    .select('id')
    .eq('type', 'routine')
    .eq('occurred_at', op.row.occurred_at)
    .eq('fields->>routineId', fields.routineId ?? '')
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  if (!winner) throw new Error('먼저 생긴 루틴 체크를 찾지 못함');

  const rows = await send({ ...op, row: { ...op.row, id: winner.id } });
  // 내 줄의 남은 변경도 이긴 줄 id로 옮긴다 (이어서 +/−를 눌렀을 수 있다)
  await db.outbox
    .where('recordId')
    .equals(op.recordId)
    .modify((pending) => {
      pending.recordId = winner.id;
      if (pending.kind === 'upsert')
        pending.row = { ...pending.row, id: winner.id };
    });
  await db.records.delete(op.recordId);
  return rows;
}

// 보낸 결과를 사본에 반영한다. 같은 기록에 아직 보내지 않은 변경이 남아 있으면 반영하지 않는다:
// 서버가 돌려준 건 "이 변경까지"의 모습이라, 기기에서 이미 더 고친 내용을 되돌리게 된다
async function applySent(db: LocalDb, op: OutboxOp, rows: LocalRecordRow[]) {
  await db.transaction('rw', db.records, db.outbox, async () => {
    await db.outbox.delete(op.seq!);
    const stillPending = await db.outbox
      .where('recordId')
      .anyOf(rows.map((row) => row.id))
      .count();
    if (stillPending > 0) return;
    await db.records.bulkPut(rows.filter((row) => row.deleted_at === null));
    await db.records.bulkDelete(
      rows.filter((row) => row.deleted_at !== null).map((row) => row.id),
    );
  });
}

export type FlushResult = 'done' | 'offline';

// 쌓인 변경을 순서대로 보낸다.
// - 닿지 못하면(오프라인·시간 초과) 거기서 멈춘다: 뒤의 변경도 어차피 못 가고, 순서가 뒤바뀌면 안 된다
// - 서버가 거절하면 그 변경에 이유를 적고, 같은 기록의 뒤 변경도 건너뛴다(순서 유지). 다른 기록은 계속 보낸다
async function flush(db: LocalDb): Promise<FlushResult> {
  const ops = await db.outbox.orderBy('seq').toArray();
  const blocked = new Set<string>();
  let isChanged = false;
  let hasNewFailure = false;

  try {
    for (const op of ops) {
      if (op.failure !== undefined || blocked.has(op.recordId)) {
        blocked.add(op.recordId);
        continue;
      }
      let rows: LocalRecordRow[];
      try {
        rows = await send(op);
      } catch (error) {
        const code = (error as ServerError | null)?.code;
        const isRoutineConflict =
          op.kind === 'upsert' && code === UNIQUE_VIOLATION;
        try {
          if (!isRoutineConflict) throw error;
          rows = await mergeRoutineCheck(db, op);
        } catch (finalError) {
          if (!isServerRejection(finalError)) return 'offline';
          await db.outbox.update(op.seq!, { failure: messageOf(finalError) });
          blocked.add(op.recordId);
          hasNewFailure = true;
          continue;
        }
      }
      await applySent(db, op, rows);
      isChanged = true;
    }
    return 'done';
  } finally {
    // 화면에 알린다: 구름 아이콘이 사라지고 서버가 붙인 값(만든 시각 등)으로 다시 그린다
    if (isChanged && typeof window !== 'undefined') {
      window.dispatchEvent(new Event(LOCAL_DB_CHANGED_EVENT));
    }
    if (hasNewFailure && typeof window !== 'undefined') {
      window.dispatchEvent(new Event(OUTBOX_FAILED_EVENT));
    }
  }
}

// 한 번에 하나만 보낸다. 보내는 중에 또 부르면(새 기록을 연달아 저장) 끝난 뒤 한 번 더 돌아 새 변경까지 보낸다
let running: Promise<FlushResult> | null = null;
let isRequestedAgain = false;

export function flushRecordOutbox(db: LocalDb): Promise<FlushResult> {
  if (running) {
    isRequestedAgain = true;
    return running;
  }
  running = (async () => {
    let result: FlushResult;
    do {
      isRequestedAgain = false;
      result = await flush(db);
    } while (isRequestedAgain && result === 'done');
    return result;
  })().finally(() => {
    running = null;
  });
  return running;
}

// "다시 시도": 거절 표시를 지우고 다시 보낸다 (서버 쪽 문제가 풀렸을 수 있다)
export async function retryFailedRecords(db: LocalDb): Promise<FlushResult> {
  await db.outbox
    .filter((op) => op.failure !== undefined)
    .modify((op) => {
      delete op.failure;
    });
  return flushRecordOutbox(db);
}
