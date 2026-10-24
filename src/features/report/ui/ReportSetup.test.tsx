// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listRecords } from '@/features/records/api/recordStore';
import ReportSetup from './ReportSetup';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/features/records/api/recordStore', () => ({
  listRecords: vi.fn(),
}));
// 켜 둔 타입은 설정 화면의 일이라 여기서는 고정 (가계부·후기·운동)
vi.mock('@/features/settings/hooks/useUserSettings', () => ({
  useVisibleTypes: () => ['expense', 'review', 'workout'],
}));

function renderSetup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ReportSetup />
    </QueryClientProvider>,
  );
}

describe('ReportSetup', () => {
  beforeEach(() => {
    // Date만 고정: 타이머까지 가짜로 바꾸면 findBy의 기다림이 멈춘다
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 24, 12));
    vi.mocked(listRecords).mockResolvedValue([
      {
        id: 'w1',
        type: 'workout',
        occurredAt: '2026-09-03',
        title: '러닝',
        memo: null,
        tags: [],
        fields: { activity: '러닝', minutes: 30 },
      },
    ]);
    push.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('처음엔 이번 달 + 켜 둔 타입 전부, 기간 안 개수를 보여 준다', async () => {
    renderSetup();

    expect(
      screen
        .getByRole('button', { name: '이번 달' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect((screen.getByLabelText('시작') as HTMLInputElement).value).toBe(
      '2026-10-01',
    );
    expect(await screen.findByText('1회')).toBeTruthy();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(
      screen
        .getAllByRole('checkbox')
        .every((box) => box.getAttribute('aria-checked') === 'true'),
    ).toBe(true);
  });

  it('지난달 + 후기 빼기 → 결과 주소로', async () => {
    renderSetup();

    fireEvent.click(screen.getByRole('button', { name: '지난달' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /후기/ }));
    fireEvent.click(screen.getByRole('button', { name: '보고서 만들기' }));

    expect(push).toHaveBeenCalledWith(
      '/report?from=2026-09-01&to=2026-09-30&types=expense%2Cworkout',
    );
  });

  it('날짜를 직접 바꾸면 칩 선택이 풀리고, 끝이 시작보다 앞이면 만들 수 없다', () => {
    renderSetup();

    fireEvent.change(screen.getByLabelText('끝'), {
      target: { value: '2026-09-15' },
    });

    expect(
      screen
        .getByRole('button', { name: '이번 달' })
        .getAttribute('aria-pressed'),
    ).toBe('false');
    expect(screen.getByText('끝 날짜가 시작보다 앞이에요')).toBeTruthy();
    expect(
      (
        screen.getByRole('button', {
          name: '보고서 만들기',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
