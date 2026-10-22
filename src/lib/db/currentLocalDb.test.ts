// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LOCAL_DB_CHANGED_EVENT,
  SYNC_WAIT_MS,
  syncBeforeRead,
} from './currentLocalDb';

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
