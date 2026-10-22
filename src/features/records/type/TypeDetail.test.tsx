// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  beforeEach(() => vi.mocked(listRecordsOfType).mockReset());
  afterEach(() => cleanup());

  it('가계부: 그 달 지출 합계와 분류별 비율, 기록 목록', async () => {
    vi.mocked(listRecordsOfType).mockResolvedValue([LUNCH, COFFEE]);
    renderTypeDetail('expense', '2026-09');

    expect(await screen.findByText('-20,000원')).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getByText('25%')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /\[식비\] 점심/ }).getAttribute('href'),
    ).toBe('/records/view?id=1');
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
});
