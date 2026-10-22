import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { openLocalDb, type LocalDb, type SyncedTable } from './localDb';
import { hasPulledOnce } from './sync';

// 지금 로그인한 계정의 기기 사본. 계정은 getSession으로 안다:
// 쿠키에 저장된 세션을 읽기만 해서 오프라인에서도 된다 (getUser는 서버에 물어봐서 오프라인이면 실패한다)
export async function currentLocalDb(): Promise<LocalDb> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const userId = data.session?.user.id;
  // 로그인 뒤 화면에서만 부른다 (proxy가 막는다). 여기까지 왔는데 세션이 없으면 사본을 고를 수 없다
  if (!userId) throw new Error('로그인 세션이 없어 기기 사본을 열 수 없음');
  return openLocalDb(userId);
}

function isKnownOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

// 동기화 실패는 화면을 멈추지 않는다: 사본에 있는 것으로 그린다 (오프라인이 대표적인 경우).
// 온라인인데 실패했으면 원인을 알 수 있게 남긴다. 오프라인 실패는 당연한 일이라 남기지 않는다
function warnSyncFailure(table: string, error: unknown): void {
  if (isKnownOffline()) return;
  console.warn(`[sync] ${table} 동기화 실패, 기기 사본으로 보여 줌`, error);
}

// 읽기 전에 동기화를 기다리는 최대 시간. 넘으면 사본으로 먼저 그린다
export const SYNC_WAIT_MS = 3_000;

// 동기화가 늦게 끝나 사본이 바뀌었음을 알리는 이벤트. QueryProvider가 듣고 조회를 다시 한다
export const LOCAL_DB_CHANGED_EVENT = 'nanaki:local-db-changed';

// 조회 전에 바뀐 것을 받되, 네트워크 때문에 화면이 멈추지 않게 한다.
// - 오프라인으로 알려져 있으면 기다리지 않는다 (요청을 보내지도 않는다)
// - 온라인이어도 SYNC_WAIT_MS까지만 기다린다. 요청이 실패도 끝도 안 나고 멈추는 경우가 있다
//   (25b E2E: 오프라인 흉내에서 서버 요청이 끝나지 않아 기록 탭이 회색 자리에 머물렀다. 신호가 약한 휴대폰도 같다)
// - 늦게 끝나면 이벤트로 알려 화면이 새 사본으로 다시 그려지게 한다
export async function syncBeforeRead(
  table: string,
  sync: () => Promise<void>,
): Promise<void> {
  if (isKnownOffline()) return;
  // 실패는 여기서 삼킨다: 기다림이 끝난 뒤 실패해도 처리되지 않은 거부(unhandled rejection)가 남지 않게
  const job = sync().then(
    () => true,
    (error: unknown) => {
      warnSyncFailure(table, error);
      return false;
    },
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), SYNC_WAIT_MS);
  });
  const result = await Promise.race([job, timeout]);
  clearTimeout(timer);
  if (result === 'timeout') {
    void job.then((isDone) => {
      if (isDone && typeof window !== 'undefined') {
        window.dispatchEvent(new Event(LOCAL_DB_CHANGED_EVENT));
      }
    });
  }
}

// 사본으로 읽기 전 동기화. 사본 상태에 따라 기다리는 방식이 다르다:
// - 한 번이라도 받아 본 사본: syncBeforeRead (실패·느림이면 기다리지 않고 지금 사본으로 그린다)
// - 한 번도 못 받은 사본(처음 방문): 다 받을 때까지 기다리고, 실패하면 오류를 그대로 던진다.
//   빈 사본으로 그리면 서버에 기록이 있어도 "기록 없음"으로 보인다. 오류면 화면이 "불러오지 못했어요 · 다시 시도"를 보여 준다
//   (31단계 실패 상태 E2E를 쓰며 찾음: 서버 조회가 실패한 처음 방문이 빈 홈으로 보였다)
// - 오프라인 처음 방문은 받을 방법이 없어 기다리지 않는다 (오프라인 배너가 알린다)
export async function syncForRead(
  db: LocalDb,
  table: SyncedTable,
  sync: () => Promise<void>,
): Promise<void> {
  if (await hasPulledOnce(db, table)) return syncBeforeRead(table, sync);
  if (isKnownOffline()) return;
  await sync();
}
