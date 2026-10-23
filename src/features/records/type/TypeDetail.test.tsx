// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBudget } from '@/features/budget/api/budgetStore';
import { emptyBudget } from '@/features/budget/schema/budget';
import { toMonthString } from '@/shared/date/month';
import { toLocalDateString } from '@/shared/date/toLocalDateString';
import { listRecordsOfType } from '../api/recordStore';
import type { RecordEntry } from '../schema/recordEntry';
import TypeDetail from './TypeDetail';

vi.mock('../api/recordStore', () => ({
  listRecordsOfType: vi.fn(),
  // 구름 아이콘(아직 안 보낸 기록). 이 테스트에서는 모두 보낸 상태
  listPendingRecordIds: vi.fn().mockResolvedValue([]),
}));

// 가계부 카드의 예산 줄이 부르는 예산 저장소 (33b). 기본은 "예산을 한 번도 정하지 않음"
vi.mock('@/features/budget/api/budgetStore', () => ({ getBudget: vi.fn() }));
// 가계부 카드의 고정지출 줄이 부르는 저장소 (33d). 없으면 줄을 그리지 않는다
vi.mock('@/features/fixedExpenses/api/fixedExpenseStore', () => ({
  listFixedExpenses: vi.fn().mockResolvedValue([]),
}));

const BASE = { memo: null, tags: [], occurredAt: '2026-09-12' };
const LUNCH: RecordEntry = {
  ...BASE,
  id: '1',
  type: 'expense',
  title: '점심',
  fields: { amount: 15000, category: '식비' },
};
const COFFEE: RecordEntry = {
  ...BASE,
  id: '2',
  type: 'expense',
  title: '커피',
  fields: { amount: 5000, category: '카페' },
};
const CAFE: RecordEntry = {
  ...BASE,
  id: '3',
  type: 'review',
  title: '동네 로스터리',
  fields: { rating: 4, targetKind: '장소' },
};

function renderTypeDetail(type: 'expense' | 'review', month: string | null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <TypeDetail type={type} month={month} />
    </QueryClientProvider>,
  );
}

describe('TypeDetail', () => {
  beforeEach(() => {
    vi.mocked(listRecordsOfType).mockReset();
    vi.mocked(getBudget).mockImplementation(async (month) => ({
      budget: emptyBudget(month),
      sourceMonth: null,
    }));
  });
  afterEach(() => cleanup());

  it('가계부: 그 달 지출 합계와 분류별 비율, 기록 목록', async () => {
    vi.mocked(listRecordsOfType).mockResolvedValue([LUNCH, COFFEE]);
    renderTypeDetail('expense', '2026-09');

    expect(await screen.findByText('-20,000원')).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getByText('25%')).toBeTruthy();
    // 타입 화면에서 연 상세는 뒤로 버튼이 이 화면(같은 달)으로 돌아온다 (detailOrigin)
    expect(
      screen.getByRole('link', { name: /\[식비\] 점심/ }).getAttribute('href'),
    ).toBe('/records/view?back=type&month=2026-09&id=1');
  });

  it('주소의 달(?month=)로 그 달 첫날~말일을 조회한다', async () => {
    vi.mocked(listRecordsOfType).mockResolvedValue([]);
    renderTypeDetail('expense', '2026-09');

    await screen.findByText('이 달에는 기록이 없어요');
    expect(listRecordsOfType).toHaveBeenCalledWith(
      'expense',
      '2026-09-01',
      '2026-09-30',
    );
  });

  it('후기: 개수·대상 종류별 개수 (0개 종류도), 평균 별점은 없다', async () => {
    vi.mocked(listRecordsOfType).mockResolvedValue([CAFE]);
    renderTypeDetail('review', '2026-09');

    expect(await screen.findByText('1건')).toBeTruthy();
    expect(screen.queryByText('평균 별점')).toBeNull();
    const kinds = screen.getByRole('list', { name: '대상 종류별 개수' });
    expect(kinds.textContent).toContain('장소1');
    expect(kinds.textContent).toContain('경험0');
  });

  it('달을 안 정하면 이번 달, 다음 달로는 갈 수 없다', async () => {
    vi.mocked(listRecordsOfType).mockResolvedValue([]);
    renderTypeDetail('expense', null);

    await screen.findByText('이 달에는 기록이 없어요');
    const thisMonth = toMonthString(toLocalDateString(new Date()));
    expect(vi.mocked(listRecordsOfType).mock.calls[0][1]).toBe(
      `${thisMonth}-01`,
    );
    // 이전 달 링크만 있고 다음 달 링크는 없다
    const nav = screen.getByRole('navigation', { name: '달 이동' });
    expect(nav.querySelectorAll('a')).toHaveLength(1);
  });

  it('가계부: 예산이 없으면 "예산 정하기", 있으면 예산 줄이 그 달 예산 화면으로 간다', async () => {
    vi.mocked(listRecordsOfType).mockResolvedValue([LUNCH, COFFEE]);
    renderTypeDetail('expense', '2026-09');
    const setUp = await screen.findByRole('link', { name: '예산 정하기' });
    expect(setUp.getAttribute('href')).toBe('/budget?month=2026-09');
    cleanup();

    vi.mocked(getBudget).mockResolvedValue({
      budget: { month: '2026-09', total: 40000, categories: {} },
      sourceMonth: '2026-09',
    });
    renderTypeDetail('expense', '2026-09');
    // 지난 달이라 남은 날 없이 "남겼어요" (오늘이 2026-09보다 뒤인 동안 성립)
    const line = await screen.findByRole('link', { name: /예산 40,000원/ });
    expect(line.getAttribute('href')).toBe('/budget?month=2026-09');
    expect(line.textContent).toContain('50%');
    expect(line.textContent).toContain('20,000원 남겼어요');
  });
});
