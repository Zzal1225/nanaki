import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeLocalDb, openLocalDb } from '@/lib/db/localDb';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { createFakeBrowserClient } from '@/lib/supabase/fakeBrowserClient.testing';
import { getBudget, saveBudget } from './budgetStore';

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

// 테스트마다 다른 계정 → 다른 기기 사본으로 시작한다
let userCount = 0;
let server: ReturnType<typeof createFakeBrowserClient>;
beforeEach(() => {
  userCount += 1;
  server = createFakeBrowserClient(`budget-user-${userCount}`);
  vi.mocked(createSupabaseBrowserClient).mockReturnValue(
    server.client as never,
  );
});
afterEach(() => {
  closeLocalDb();
  vi.unstubAllGlobals();
});

const SEPTEMBER = {
  month: '2026-09',
  total_amount: 500000,
  category_amounts: { 식비: 250000 },
};

describe('예산 조회', () => {
  it('그 달 예산이 없으면 가장 최근 달 예산을 이어받는다 (어느 달 값인지도 알려 준다)', async () => {
    server.respond({ data: SEPTEMBER, error: null });
    const view = await getBudget('2026-10');

    expect(view).toEqual({
      budget: { month: '2026-10', total: 500000, categories: { 식비: 250000 } },
      sourceMonth: '2026-09',
    });
    // "그 달 또는 그 이전 중 최근" 한 줄을 묻는다
    expect(server.calls).toContainEqual({
      table: 'budgets',
      method: 'lte',
      args: ['month', '2026-10'],
    });
  });

  it('한 번도 정하지 않았으면 빈 예산', async () => {
    server.respond({ data: null, error: null });
    expect(await getBudget('2026-10')).toEqual({
      budget: { month: '2026-10', total: null, categories: {} },
      sourceMonth: null,
    });
  });

  it('서버가 실패하면 기기 사본으로, 사본도 없으면 오류', async () => {
    server.failNext();
    await expect(getBudget('2026-10')).rejects.toThrow();

    server.respond({ data: SEPTEMBER, error: null });
    await getBudget('2026-10');
    server.failNext();
    expect((await getBudget('2026-11')).sourceMonth).toBe('2026-09');
  });

  it('오프라인이면 서버에 묻지 않고 사본으로', async () => {
    server.respond({ data: SEPTEMBER, error: null });
    await getBudget('2026-10');
    const callsBefore = server.calls.length;

    vi.stubGlobal('navigator', { onLine: false });
    expect((await getBudget('2026-10')).budget.total).toBe(500000);
    expect(server.calls.length).toBe(callsBefore);
  });

  it('예산이 없는 계정도 한 번 받은 뒤 오프라인이면 오류가 아니라 빈 예산 (예산 정하기)', async () => {
    // 2026-10-23 아이폰 비행기 모드: "없음"은 사본에 남는 줄이 없어서 오프라인에서 오류가 보였다
    server.respond({ data: null, error: null });
    await getBudget('2026-10');

    vi.stubGlobal('navigator', { onLine: false });
    expect(await getBudget('2026-10')).toEqual({
      budget: { month: '2026-10', total: null, categories: {} },
      sourceMonth: null,
    });
    // 온라인이라 믿었는데 서버에 못 닿는 경우도 같다
    vi.unstubAllGlobals();
    server.failNext();
    expect((await getBudget('2026-11')).sourceMonth).toBeNull();
  });

  it('서버의 분류 예산 모양이 틀리면 믿지 않는다 (jsonb)', async () => {
    server.respond({
      data: { ...SEPTEMBER, category_amounts: { 식비: '많이' } },
      error: null,
    });
    await expect(getBudget('2026-10')).rejects.toThrow();
  });
});

describe('예산 저장', () => {
  it('그 달 줄로 저장하고 사본에도 남긴다', async () => {
    const october = {
      month: '2026-10',
      total_amount: 600000,
      category_amounts: { 식비: 300000 },
    };
    server.respond({ data: october, error: null });
    const view = await saveBudget({
      month: '2026-10',
      total: 600000,
      categories: { 식비: 300000 },
    });

    expect(view.sourceMonth).toBe('2026-10');
    expect(
      server.calls.find((call) => call.method === 'upsert')?.args[0],
    ).toEqual(october);
    const copy = await openLocalDb(`budget-user-${userCount}`).budgets.get(
      '2026-10',
    );
    expect(copy?.total).toBe(600000);
  });

  it('잘못된 값은 서버에 보내지 않는다', async () => {
    await expect(
      saveBudget({ month: '2026-10', total: -1, categories: {} }),
    ).rejects.toThrow();
    expect(server.calls).toEqual([]);
  });
});
