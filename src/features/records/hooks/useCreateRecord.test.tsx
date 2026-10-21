// @vitest-environment jsdom
// 훅은 React 안에서만 돌아서 가짜 브라우저 환경(jsdom)이 필요하다
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRecord, type NewRecordInput } from '../api/recordStore';
import { useCreateRecord } from './useCreateRecord';

// 실제 Supabase를 부르지 않도록 저장 함수를 가짜로 바꾼다. 이 테스트는 "저장 뒤 무엇을 하는지"만 본다
vi.mock('../api/recordStore', () => ({ createRecord: vi.fn() }));

const INPUT: NewRecordInput = {
  type: 'expense',
  occurredAt: '2026-10-21',
  title: '점심',
  memo: null,
  tags: [],
  fields: { amount: 12500, category: '식비' },
};

function setup() {
  // 테스트마다 새 캐시. 실패 테스트가 재시도로 느려지지 않게 retry는 끈다
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useCreateRecord(), { wrapper });
  return { result, invalidate };
}

describe('useCreateRecord', () => {
  beforeEach(() => {
    vi.mocked(createRecord).mockReset();
  });

  it("저장에 성공하면 'records' 캐시를 모두 무효화한다", async () => {
    vi.mocked(createRecord).mockResolvedValue({ ...INPUT, id: 'new-id' });
    const { result, invalidate } = setup();

    await act(() => result.current.mutateAsync(INPUT));

    // mutationFn을 넘기는 방식에 따라 두 번째 인자가 붙기도 해서 첫 번째 인자만 본다
    expect(vi.mocked(createRecord).mock.calls[0][0]).toEqual(INPUT);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['records'] });
  });

  it('저장에 실패하면 무효화하지 않고 오류를 그대로 알린다', async () => {
    vi.mocked(createRecord).mockRejectedValue(new Error('네트워크 오류'));
    const { result, invalidate } = setup();

    await expect(act(() => result.current.mutateAsync(INPUT))).rejects.toThrow(
      '네트워크 오류',
    );
    expect(invalidate).not.toHaveBeenCalled();
  });
});
