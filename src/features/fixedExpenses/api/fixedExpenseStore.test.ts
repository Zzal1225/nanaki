import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeLocalDb } from '@/lib/db/localDb';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { createFakeBrowserClient } from '@/lib/supabase/fakeBrowserClient.testing';
import {
  createFixedExpense,
  deleteFixedExpense,
  listFixedExpenses,
} from './fixedExpenseStore';

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

let userCount = 0;
let server: ReturnType<typeof createFakeBrowserClient>;
beforeEach(() => {
  userCount += 1;
  server = createFakeBrowserClient(`fixed-user-${userCount}`);
  vi.mocked(createSupabaseBrowserClient).mockReturnValue(
    server.client as never,
  );
});
afterEach(() => {
  closeLocalDb();
  vi.unstubAllGlobals();
});

const PHONE = {
  id: '11111111-1111-4111-8111-111111111111',
  name: '통신비',
  amount: 55000,
  category: '생활',
  payment_method: '카드',
  schedule: { kind: 'monthly', day: 25 },
  start_date: '2026-10-01',
  last_recorded_on: null,
};
const NETFLIX = {
  id: '22222222-2222-4222-8222-222222222222',
  name: '넷플릭스',
  amount: 13500,
  category: '생활',
  payment_method: null,
  schedule: { kind: 'monthly', day: 12 },
  start_date: '2026-09-01',
  last_recorded_on: '2026-10-12',
};

const RENT_INPUT = {
  name: '월세',
  amount: 700000,
  category: '생활',
  schedule: { kind: 'monthly' as const, day: 5 },
};

describe('고정지출 조회', () => {
  it('결제일 순으로, 결제수단이 없으면 칸을 뺀다', async () => {
    server.respond({ data: [PHONE, NETFLIX], error: null });
    const items = await listFixedExpenses();

    expect(items.map((item) => item.name)).toEqual(['넷플릭스', '통신비']);
    expect(items[0]).not.toHaveProperty('paymentMethod');
    expect(items[1].paymentMethod).toBe('카드');
  });

  it('한 번 받은 뒤 오프라인이면 서버에 묻지 않고 사본으로', async () => {
    server.respond({ data: [PHONE], error: null });
    await listFixedExpenses();

    vi.stubGlobal('navigator', { onLine: false });
    const items = await listFixedExpenses();
    expect(items.map((item) => item.name)).toEqual(['통신비']);
    expect(
      server.calls.filter((call) => call.method === 'select'),
    ).toHaveLength(1);
  });

  it('한 번도 못 받았는데 실패하면 오류 (빈 사본을 "없음"으로 보이지 않게), 받은 뒤 실패면 사본', async () => {
    server.failNext();
    await expect(listFixedExpenses()).rejects.toThrow();

    server.respond({ data: [PHONE], error: null });
    await listFixedExpenses();
    server.failNext();
    expect((await listFixedExpenses()).map((item) => item.name)).toEqual([
      '통신비',
    ]);
  });
});

describe('고정지출 추가', () => {
  function insertedRow() {
    return server.calls.find((call) => call.method === 'insert')?.args[0];
  }

  it('오늘부터 시작, 체크한 기록의 날짜를 "이번 달 기록함"으로 남긴다 (서버가 같은 달에 또 만들지 않게)', async () => {
    server.respond({
      data: { ...PHONE, last_recorded_on: '2026-10-23' },
      error: null,
    });
    await createFixedExpense(RENT_INPUT, {
      today: '2026-10-23',
      recordedOn: '2026-10-23',
    });

    expect(insertedRow()).toMatchObject({
      name: '월세',
      payment_method: null,
      schedule: { kind: 'monthly', day: 5 },
      start_date: '2026-10-23',
      last_recorded_on: '2026-10-23',
    });
  });

  it('서버 저장이 실패하면 오류 (작성 폼이 "등록하지 못했어요"로 알린다)', async () => {
    server.failNext();
    await expect(
      createFixedExpense(RENT_INPUT, { today: '2026-10-23', recordedOn: null }),
    ).rejects.toThrow();
  });

  it('잘못된 값은 서버에 보내기 전에 막는다', async () => {
    await expect(
      createFixedExpense(
        { ...RENT_INPUT, amount: 0 },
        { today: '2026-10-23', recordedOn: null },
      ),
    ).rejects.toThrow();
    expect(server.calls).toEqual([]);
  });
});

describe('고정지출 삭제', () => {
  it('서버에서 지우고 사본에서도 뺀다', async () => {
    server.respond({ data: [PHONE, NETFLIX], error: null });
    await listFixedExpenses();

    server.respond({ data: null, error: null });
    await deleteFixedExpense(PHONE.id);
    expect(server.calls).toContainEqual({
      table: 'fixed_expenses',
      method: 'eq',
      args: ['id', PHONE.id],
    });

    vi.stubGlobal('navigator', { onLine: false });
    expect((await listFixedExpenses()).map((item) => item.name)).toEqual([
      '넷플릭스',
    ]);
  });
});
