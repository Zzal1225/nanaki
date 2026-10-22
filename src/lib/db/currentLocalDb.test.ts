// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LOCAL_DB_CHANGED_EVENT,
  SYNC_WAIT_MS,
  syncBeforeRead,
  syncForRead,
} from './currentLocalDb';
import type { LocalDb } from './localDb';

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('읽기 전 동기화', () => {
  it('오프라인으로 알려져 있으면 동기화를 부르지도 기다리지도 않는다', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const sync = vi.fn(async () => {});
    await syncBeforeRead('records', sync);
    expect(sync).not.toHaveBeenCalled();
  });

  it('실패는 삼킨다 (사본으로 그린다)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(
      syncBeforeRead('records', async () => {
        throw new Error('서버 오류');
      }),
    ).resolves.toBeUndefined();
  });

  // 25b E2E에서 실제로 일어난 일: 서버 요청이 실패도 끝도 안 나서 화면이 회색 자리에 머물렀다
  it('끝나지 않는 동기화는 3초 뒤 기다림을 그만두고, 늦게 끝나면 화면에 알린다', async () => {
    vi.useFakeTimers();
    let finish: () => void = () => {};
    const sync = () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      });
    const changed = vi.fn();
    window.addEventListener(LOCAL_DB_CHANGED_EVENT, changed);

    const waiting = syncBeforeRead('records', sync);
    await vi.advanceTimersByTimeAsync(SYNC_WAIT_MS);
    await expect(waiting).resolves.toBeUndefined();
    expect(changed).not.toHaveBeenCalled();

    finish();
    await vi.runAllTimersAsync();
    expect(changed).toHaveBeenCalledTimes(1);
    window.removeEventListener(LOCAL_DB_CHANGED_EVENT, changed);
  });

  it('제때 끝나면 알리지 않는다 (이미 새 사본으로 읽는다)', async () => {
    const changed = vi.fn();
    window.addEventListener(LOCAL_DB_CHANGED_EVENT, changed);
    await syncBeforeRead('records', async () => {});
    expect(changed).not.toHaveBeenCalled();
    window.removeEventListener(LOCAL_DB_CHANGED_EVENT, changed);
  });
});

// 사본을 받아 본 적이 있는지만 보는 가짜 사본 (hasPulledOnce는 meta 표의 커서 줄로 판단한다)
function fakeDb(hasPulled: boolean): LocalDb {
  return {
    meta: { get: async () => (hasPulled ? { table: 'records' } : undefined) },
  } as unknown as LocalDb;
}

describe('사본 상태에 따른 읽기 전 동기화', () => {
  it('받아 본 사본이면 실패를 삼키고 지금 사본으로 그린다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(
      syncForRead(fakeDb(true), 'records', async () => {
        throw new Error('서버 오류');
      }),
    ).resolves.toBeUndefined();
  });

  // 빈 사본을 그리면 서버에 기록이 있어도 "기록 없음"으로 보인다 → 화면이 "불러오지 못했어요 · 다시 시도"를 보이게
  it('처음 방문이면 실패를 그대로 던진다', async () => {
    await expect(
      syncForRead(fakeDb(false), 'records', async () => {
        throw new Error('서버 오류');
      }),
    ).rejects.toThrow('서버 오류');
  });

  it('처음 방문은 3초를 넘겨도 다 받을 때까지 기다린다', async () => {
    vi.useFakeTimers();
    let isDone = false;
    const job = syncForRead(fakeDb(false), 'records', async () => {
      await new Promise((resolve) => setTimeout(resolve, SYNC_WAIT_MS * 2));
      isDone = true;
    });
    await vi.advanceTimersByTimeAsync(SYNC_WAIT_MS * 2);
    await job;
    expect(isDone).toBe(true);
  });

  it('오프라인 처음 방문은 받을 방법이 없어 부르지 않는다', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const sync = vi.fn(async () => {});
    await syncForRead(fakeDb(false), 'records', sync);
    expect(sync).not.toHaveBeenCalled();
  });
});
