import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { restoreRecord } from './recordStore';

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
