import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { createFakeBrowserClient } from '@/lib/supabase/fakeBrowserClient.testing';
import { prepareDeviceDataCleanup } from './deviceData';
import { closeLocalDb, localDbName, openLocalDb } from './localDb';

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

afterEach(() => {
  closeLocalDb();
  vi.unstubAllGlobals();
});

// 브라우저 캐시(Cache Storage) 흉내: 이름 목록과 지운 이름만 본다
function stubCaches(names: string[]) {
  const deleted: string[] = [];
  vi.stubGlobal('caches', {
    keys: async () => names,
    delete: async (name: string) => {
      deleted.push(name);
      return true;
    },
  });
  return deleted;
}

describe('로그아웃 때 기기 데이터 지우기', () => {
  it('그 계정의 기기 사본을 지우고, 미리 받은 앱 파일 캐시만 남긴다', async () => {
    const { client } = createFakeBrowserClient('leaving-user');
    vi.mocked(createSupabaseBrowserClient).mockReturnValue(client as never);
    const db = openLocalDb('leaving-user');
    await db.settings.put({ key: 'user', hiddenTypes: ['body'] });
    const deleted = stubCaches([
      'serwist-precache-v2-http://localhost:3000/',
      'app-pages-abc',
      'pages-rsc-prefetch',
    ]);

    const cleanup = await prepareDeviceDataCleanup();
    // 로그아웃으로 세션이 사라져도 미리 알아 둔 이름으로 지운다
    vi.mocked(createSupabaseBrowserClient).mockReturnValue(
      createFakeBrowserClient(null).client as never,
    );
    await cleanup();

    expect(await Dexie.exists(localDbName('leaving-user'))).toBe(false);
    expect(deleted.sort()).toEqual(['app-pages-abc', 'pages-rsc-prefetch']);
  });

  it('세션이 이미 없으면 화면 캐시만 지운다 (오류 없이)', async () => {
    vi.mocked(createSupabaseBrowserClient).mockReturnValue(
      createFakeBrowserClient(null).client as never,
    );
    const deleted = stubCaches(['app-pages-abc']);

    const cleanup = await prepareDeviceDataCleanup();
    await cleanup();
    expect(deleted).toEqual(['app-pages-abc']);
  });
});
