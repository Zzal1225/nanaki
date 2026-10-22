import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeLocalDb } from '@/lib/db/localDb';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { createFakeBrowserClient } from '@/lib/supabase/fakeBrowserClient.testing';
import { getUserSettings, updateHiddenTypes } from './settingsStore';

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

let count = 0;
let server: ReturnType<typeof createFakeBrowserClient>;
beforeEach(() => {
  count += 1;
  server = createFakeBrowserClient(`settings-${count}`);
  vi.mocked(createSupabaseBrowserClient).mockReturnValue(
    server.client as never,
  );
});
afterEach(() => {
  closeLocalDb();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('설정 사본', () => {
  it('서버 값을 받으면 사본에 남기고, 다음에 서버가 실패하면 사본으로 답한다', async () => {
    server.respond({ data: { hidden_types: ['review'] }, error: null });
    expect(await getUserSettings()).toEqual({ hiddenTypes: ['review'] });

    server.failNext();
    expect(await getUserSettings()).toEqual({ hiddenTypes: ['review'] });
  });

  it('바꾼 값도 사본에 남는다', async () => {
    server.respond({ data: { hidden_types: ['body'] }, error: null });
    await updateHiddenTypes(['body']);

    server.failNext();
    expect(await getUserSettings()).toEqual({ hiddenTypes: ['body'] });
  });

  it('오프라인이면 서버에 묻지 않고 사본으로', async () => {
    server.respond({ data: null, error: null });
    await getUserSettings();
    vi.stubGlobal('navigator', { onLine: false });
    const callsBefore = server.calls.length;

    expect(await getUserSettings()).toEqual({ hiddenTypes: [] });
    expect(server.calls.length).toBe(callsBefore);
  });

  // 모든 타입을 켠 것처럼 꾸며 보이지 않는다
  it('사본도 없고 서버도 실패하면 오류', async () => {
    server.failNext('Failed to fetch');
    await expect(getUserSettings()).rejects.toThrow('Failed to fetch');
  });
});
