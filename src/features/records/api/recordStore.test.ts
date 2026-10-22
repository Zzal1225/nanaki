import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  listRecentRecords,
  restoreRecord,
  SEARCH_RESULT_LIMIT,
  searchRecords,
} from './recordStore';

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

// update().eq().not().select() 사슬의 마지막 결과만 정하는 가짜.
// 각 단계가 자기 자신을 돌려주고, 마지막 select가 결과를 준다
function mockUpdateResult(result: { data: unknown; error: unknown }) {
  const chain = {
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    not: vi.fn(() => chain),
    select: vi.fn(async () => result),
  };
  vi.mocked(createSupabaseBrowserClient).mockReturnValue({
    from: () => chain,
  } as never);
  return chain;
}

describe('restoreRecord', () => {
  beforeEach(() => vi.clearAllMocks());

  it('지운 기록을 되돌린다 (deleted_at을 비움)', async () => {
    const chain = mockUpdateResult({ data: [{ id: 'a' }], error: null });

    await expect(restoreRecord('a')).resolves.toBeUndefined();
    expect(chain.update).toHaveBeenCalledWith({ deleted_at: null });
  });

  // 대시보드에서 줄을 아예 지운 경우 등: 오류 없이 0줄이 바뀐다. 성공으로 알리면 안 된다
  it('바뀐 줄이 없으면 실패로 알린다', async () => {
    mockUpdateResult({ data: [], error: null });

    await expect(restoreRecord('gone')).rejects.toThrow('되돌릴 기록이 없음');
  });

  it('DB 오류는 그대로 던진다', async () => {
    const dbError = new Error('네트워크 오류');
    mockUpdateResult({ data: null, error: dbError });

    await expect(restoreRecord('a')).rejects.toBe(dbError);
  });
});

// select().not().is().order()...limit() 사슬. 마지막 limit이 결과를 준다
function mockListResult(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn(() => chain),
    not: vi.fn(() => chain),
    is: vi.fn(() => chain),
    or: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => result),
  };
  vi.mocked(createSupabaseBrowserClient).mockReturnValue({
    from: () => chain,
  } as never);
  return chain;
}

describe('listRecentRecords', () => {
  beforeEach(() => vi.clearAllMocks());

  // 매일 쌓이는 루틴 체크가 limit을 다 차지하지 않게 DB에서 뺀다 (받아 온 뒤 버리면 다른 기록이 몇 개 안 남는다)
  it('루틴 체크는 DB 조건으로 뺀다', async () => {
    const chain = mockListResult({ data: [], error: null });
    await listRecentRecords(20);
    expect(chain.not).toHaveBeenCalledWith('type', 'in', '(routine)');
    expect(chain.limit).toHaveBeenCalledWith(20);
  });
});

describe('searchRecords', () => {
  beforeEach(() => vi.clearAllMocks());

  it('한도보다 하나 더 받아서, 넘었으면 잘라 내고 알린다', async () => {
    const rows = Array.from({ length: SEARCH_RESULT_LIMIT + 1 }, () => ({}));
    const chain = mockListResult({ data: rows, error: null });
    const result = await searchRecords({
      keyword: '',
      sort: 'latest',
      range: null,
    });
    expect(chain.limit).toHaveBeenCalledWith(SEARCH_RESULT_LIMIT + 1);
    expect(result.isTruncated).toBe(true);
  });

  it('검색어가 없으면 글자 조건을 걸지 않는다', async () => {
    const chain = mockListResult({ data: [], error: null });
    await searchRecords({ keyword: '', sort: 'oldest', range: null });
    expect(chain.or).not.toHaveBeenCalled();
    expect(chain.order).toHaveBeenCalledWith('occurred_at', {
      ascending: true,
    });
  });
});
