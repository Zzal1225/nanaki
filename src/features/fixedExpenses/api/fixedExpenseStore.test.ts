import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRecord } from '@/features/records/api/recordStore';
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
// 기록 만들기는 기록 저장소의 일이라(대기열·동기화) 여기서는 "무엇을 만들라고 했는지"만 본다
vi.mock('@/features/records/api/recordStore', () => ({
  createRecord: vi.fn(),
}));

let userCount = 0;
let server: ReturnType<typeof createFakeBrowserClient>;
beforeEach(() => {
  userCount += 1;
  server = createFakeBrowserClient(`fixed-user-${userCount}`);
  vi.mocked(createSupabaseBrowserClient).mockReturnValue(
    server.client as never,
  );
  vi.mocked(createRecord).mockReset();
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
  function respondSaved(lastRecordedOn: string | null) {
    server.respond({
      data: {
        ...PHONE,
        id: '33333333-3333-4333-8333-333333333333',
        name: '월세',
        amount: 700000,
        payment_method: null,
        schedule: { kind: 'monthly', day: 5 },
        start_date: '2026-10-23',
        last_recorded_on: lastRecordedOn,
      },
      error: null,
    });
  }

  function insertedRow() {
    return server.calls.find((call) => call.method === 'insert')?.args[0];
  }

  it('기본: 오늘부터 시작, 지난 이번 달 결제일은 기록하지 않는다', async () => {
    respondSaved(null);
    await createFixedExpense(RENT_INPUT, {
      today: '2026-10-23',
      includeCurrentMonth: false,
    });

    expect(insertedRow()).toMatchObject({
      name: '월세',
      payment_method: null,
      start_date: '2026-10-23',
      last_recorded_on: null,
    });
    expect(createRecord).not.toHaveBeenCalled();
  });

  it('"이번 달도 기록": 결제일 날짜로 고정지출 태그 기록을 만들고, 서버가 같은 달에 또 만들지 않게 표시한다', async () => {
    respondSaved('2026-10-05');
    await createFixedExpense(
      { ...RENT_INPUT, paymentMethod: '계좌이체' },
      { today: '2026-10-23', includeCurrentMonth: true },
    );

    expect(insertedRow()).toMatchObject({ last_recorded_on: '2026-10-05' });
    expect(createRecord).toHaveBeenCalledWith({
      type: 'expense',
      occurredAt: '2026-10-05',
      title: '월세',
      memo: null,
      tags: ['고정지출'],
      fields: { amount: 700000, category: '생활', paymentMethod: '계좌이체' },
    });
  });

  it('결제일이 아직 안 지났으면 "이번 달도"를 골라도 지금 만들지 않는다 (서버가 그날 만든다)', async () => {
    respondSaved(null);
    await createFixedExpense(
      { ...RENT_INPUT, schedule: { kind: 'monthly', day: 25 } },
      { today: '2026-10-23', includeCurrentMonth: true },
    );

    expect(insertedRow()).toMatchObject({ last_recorded_on: null });
    expect(createRecord).not.toHaveBeenCalled();
  });

  it('서버 저장이 실패하면 기록도 만들지 않는다', async () => {
    server.failNext();
    await expect(
      createFixedExpense(RENT_INPUT, {
        today: '2026-10-23',
        includeCurrentMonth: true,
      }),
    ).rejects.toThrow();
    expect(createRecord).not.toHaveBeenCalled();
  });

  it('잘못된 값은 서버에 보내기 전에 막는다', async () => {
    await expect(
      createFixedExpense(
        { ...RENT_INPUT, amount: 0 },
        { today: '2026-10-23', includeCurrentMonth: false },
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
