// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserSettings, updateHiddenTypes } from './api/settingsStore';
import TypeVisibilitySection from './TypeVisibilitySection';

// 실제 DB 대신 가짜. "스위치를 누르면 어떤 목록을 저장하는지"만 본다
vi.mock('./api/settingsStore', () => ({
  getUserSettings: vi.fn(),
  updateHiddenTypes: vi.fn(),
}));

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <TypeVisibilitySection />
    </QueryClientProvider>,
  );
}

describe('TypeVisibilitySection', () => {
  beforeEach(() => {
    vi.mocked(getUserSettings).mockReset();
    vi.mocked(updateHiddenTypes).mockReset();
  });
  afterEach(() => cleanup());

  it('끄면 숨긴 목록을 저장하고, 바로 "숨겨져요" 안내가 보인다', async () => {
    // 저장한 값을 기억하는 가짜 DB. 저장 뒤 다시 불러올 때(onSettled 무효화) 진짜처럼 새 값을 준다
    let stored: string[] = [];
    vi.mocked(getUserSettings).mockImplementation(async () => ({
      hiddenTypes: stored,
    }));
    vi.mocked(updateHiddenTypes).mockImplementation(async (hiddenTypes) => {
      stored = hiddenTypes;
      return { hiddenTypes };
    });
    renderSection();

    const reviewSwitch = await screen.findByRole('switch', { name: '후기' });
    expect(reviewSwitch.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(reviewSwitch);

    // mutate는 onMutate(캐시 먼저 바꾸기)를 기다린 뒤 저장을 부르므로 호출도 기다린다
    await waitFor(() =>
      expect(vi.mocked(updateHiddenTypes).mock.calls[0]?.[0]).toEqual([
        'review',
      ]),
    );
    // 저장을 기다리지 않고 바로 바뀐다 (낙관적 업데이트)
    await waitFor(() =>
      expect(reviewSwitch.getAttribute('aria-checked')).toBe('false'),
    );
    expect(screen.getByText('기록은 지워지지 않고 숨겨져요')).toBeTruthy();
  });

  it('마지막 하나 남은 타입은 끌 수 없다', async () => {
    vi.mocked(getUserSettings).mockResolvedValue({
      hiddenTypes: ['review', 'workout', 'body'],
    });
    renderSection();

    const expenseSwitch = await screen.findByRole('switch', { name: '가계부' });
    expect((expenseSwitch as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('하나는 켜 두어야 해요')).toBeTruthy();
  });

  it('저장에 실패하면 원래대로 돌아간다', async () => {
    vi.mocked(getUserSettings).mockResolvedValue({ hiddenTypes: [] });
    vi.mocked(updateHiddenTypes).mockRejectedValue(new Error('네트워크 오류'));
    renderSection();

    const reviewSwitch = await screen.findByRole('switch', { name: '후기' });
    fireEvent.click(reviewSwitch);

    await waitFor(() =>
      expect(reviewSwitch.getAttribute('aria-checked')).toBe('true'),
    );
  });
});
