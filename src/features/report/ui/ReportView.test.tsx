// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBudget } from '@/features/budget/api/budgetStore';
import { listRecords } from '@/features/records/api/recordStore';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import { listRoutines } from '@/features/routines/api/routineStore';
import { useToastStore } from '@/shared/toast/toastStore';
import ReportView from './ReportView';

vi.mock('@/features/records/api/recordStore', () => ({
  listRecords: vi.fn(),
}));
vi.mock('@/features/routines/api/routineStore', () => ({
  listRoutines: vi.fn(),
}));
vi.mock('@/features/budget/api/budgetStore', () => ({
  getBudget: vi.fn(),
}));

const BASE = { memo: null, tags: [] as string[] };
const ROUTINE_ID = '11111111-1111-4111-8111-111111111111';

// 지난 9월(오늘보다 앞)이라 루틴 달성률이 9월 30일 전체로 센다
const RECORDS: RecordEntry[] = [
  {
    ...BASE,
    id: 'e1',
    type: 'expense',
    occurredAt: '2026-09-02',
    title: '점심',
    fields: { amount: 160000, category: '식비' },
  },
  {
    ...BASE,
    id: 'e2',
    type: 'expense',
    occurredAt: '2026-09-05',
    title: '택시',
    fields: { amount: 9000, category: '교통' },
  },
  {
    ...BASE,
    id: 'v1',
    type: 'review',
    occurredAt: '2026-09-03',
    title: '성수 카페',
    fields: { rating: 4, targetKind: '장소' },
  },
  {
    ...BASE,
    id: 'v2',
    type: 'review',
    occurredAt: '2026-09-09',
    title: '좋은 책',
    fields: { rating: 5, targetKind: '콘텐츠' },
  },
  {
    ...BASE,
    id: 'r1',
    type: 'routine',
    occurredAt: '2026-09-01',
    title: '스트레칭',
    fields: { routineId: ROUTINE_ID, count: 1, target: 1, unit: '' },
  },
  {
    ...BASE,
    id: 'r2',
    type: 'routine',
    occurredAt: '2026-09-02',
    title: '스트레칭',
    fields: { routineId: ROUTINE_ID, count: 1, target: 1, unit: '' },
  },
  // 고르지 않은 타입은 보고서에 넣지 않는다
  {
    ...BASE,
    id: 'w1',
    type: 'workout',
    occurredAt: '2026-09-04',
    title: '러닝',
    fields: { activity: '러닝', minutes: 30 },
  },
];

function renderView() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ReportView
        query={{
          from: '2026-09-01',
          to: '2026-09-30',
          types: ['expense', 'review', 'routine'],
        }}
      />
    </QueryClientProvider>,
  );
}

describe('ReportView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 24, 12));
    vi.mocked(listRecords).mockResolvedValue(RECORDS);
    vi.mocked(listRoutines).mockResolvedValue([
      {
        id: ROUTINE_ID,
        name: '스트레칭',
        startDate: '2026-09-01',
        schedule: { kind: 'weekly', days: [0, 1, 2, 3, 4, 5, 6] },
        goal: { kind: 'check' },
        endedOn: null,
        remindAt: null,
      },
    ]);
    vi.mocked(getBudget).mockResolvedValue({
      budget: { month: '2026-09', total: 200000, categories: { 식비: 150000 } },
      sourceMonth: '2026-09',
    });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('고른 타입만 카드로, 한 달이면 예산 줄, 후기는 별점 높은 순, 루틴은 해야 할 날 대비', async () => {
    renderView();

    expect(
      screen.getByRole('heading', { level: 1, name: '2026년 9월 보고서' }),
    ).toBeTruthy();
    expect(await screen.findByRole('region', { name: '가계부' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: '운동' })).toBeNull();
    expect(
      await screen.findByText('예산 200,000원 중 85% 사용 · 초과 분류: 식비'),
    ).toBeTruthy();

    const reviews = screen
      .getAllByRole('listitem')
      .map((item) => item.textContent);
    expect(reviews[0]).toContain('좋은 책');
    expect(reviews[1]).toContain('성수 카페');
    // 평균 별점은 내지 않는다 (2026-10-22 사용자 결정)
    expect(screen.queryByText(/평균/)).toBeNull();

    // 루틴은 모두 해낸 날 / 루틴이 있던 날 (2026-10-25 사용자 결정)
    expect(await screen.findByText('2 / 30일')).toBeTruthy();
  });

  it('PDF로 저장 = 브라우저 인쇄, 인쇄하는 동안만 라이트', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    document.documentElement.classList.add('dark');
    renderView();

    fireEvent.click(screen.getByRole('button', { name: 'PDF로 저장' }));
    expect(print).toHaveBeenCalled();

    window.dispatchEvent(new Event('beforeprint'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    window.dispatchEvent(new Event('afterprint'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    document.documentElement.classList.remove('dark');
  });

  // 2026-10-26 사용자: 아이폰에서 PDF를 저장해도 아무 반응이 없어 저장됐는지 몰랐다
  it('인쇄 창이 닫히면 PDF를 어디서 찾는지 토스트로', () => {
    useToastStore.setState({ toast: null });
    renderView();
    window.dispatchEvent(new Event('afterprint'));
    expect(useToastStore.getState().toast?.message).toContain(
      'PDF로 저장했다면',
    );
    // 5초는 읽기 전에 사라졌다 → 길게
    expect(useToastStore.getState().toast?.durationMs).toBe(10_000);
  });
});
