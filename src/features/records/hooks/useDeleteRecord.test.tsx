// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from '@/shared/toast/toastStore';
import { deleteRecord, restoreRecord } from '../api/recordStore';
import { useDeleteRecord } from './useDeleteRecord';

vi.mock('../api/recordStore', () => ({
  deleteRecord: vi.fn(),
  restoreRecord: vi.fn(),
}));

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result, unmount } = renderHook(() => useDeleteRecord(), { wrapper });
  return { result, unmount, invalidate };
}

describe('useDeleteRecord', () => {
  beforeEach(() => {
    vi.mocked(deleteRecord).mockReset();
    vi.mocked(restoreRecord).mockReset();
    useToastStore.setState({ toast: null });
  });

  it('지우면 "기록을 삭제했어요" + 되돌리기 토스트, 기록 캐시 무효화', async () => {
    vi.mocked(deleteRecord).mockResolvedValue();
    const { result, invalidate } = setup();

    await act(() => result.current.mutateAsync('rec-1'));

    const toast = useToastStore.getState().toast;
    expect(toast?.message).toBe('기록을 삭제했어요');
    expect(toast?.action?.label).toBe('되돌리기');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['records'] });
  });

  // 되돌리기는 상세 화면이 사라진 뒤에 눌리므로, 훅이 언마운트돼도 동작해야 한다
  it('화면을 떠난 뒤 되돌리기를 눌러도 그 기록을 되살리고 알려 준다', async () => {
    vi.mocked(deleteRecord).mockResolvedValue();
    vi.mocked(restoreRecord).mockResolvedValue();
    const { result, unmount } = setup();
    await act(() => result.current.mutateAsync('rec-1'));
    unmount();

    act(() => useToastStore.getState().toast?.action?.onAction());

    await waitFor(() =>
      expect(useToastStore.getState().toast?.message).toBe('기록을 되돌렸어요'),
    );
    expect(restoreRecord).toHaveBeenCalledWith('rec-1');
  });

  it('되돌리기에 실패하면 안내 토스트', async () => {
    vi.mocked(deleteRecord).mockResolvedValue();
    vi.mocked(restoreRecord).mockRejectedValue(new Error('네트워크 오류'));
    const { result } = setup();
    await act(() => result.current.mutateAsync('rec-1'));

    act(() => useToastStore.getState().toast?.action?.onAction());

    await waitFor(() =>
      expect(useToastStore.getState().toast?.message).toContain(
        '되돌리지 못했어요',
      ),
    );
  });

  it('지우기에 실패하면 토스트를 띄우지 않고 오류를 그대로 알린다', async () => {
    vi.mocked(deleteRecord).mockRejectedValue(new Error('네트워크 오류'));
    const { result } = setup();

    await expect(
      act(() => result.current.mutateAsync('rec-1')),
    ).rejects.toThrow();
    expect(useToastStore.getState().toast).toBeNull();
  });
});
