// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listRecentRecords, listRecords } from '../api/recordStore';
import type { RecordEntry } from '../schema/recordEntry';
import { getUserSettings } from '@/features/settings/api/settingsStore';
import RecordsOverview from './RecordsOverview';

// 실제 Supabase 대신 가짜. 이 테스트는 "받은 기록을 어떻게 보여 주는지"만 본다
// 테스트에는 Next 라우터가 없어서 지금 주소를 가짜로 준다 (PC 선택 표시용)
vi.mock('next/navigation', () => ({ usePathname: () => '/records' }));
vi.mock('@/features/settings/api/settingsStore', () => ({
  getUserSettings: vi.fn(),
  updateHiddenTypes: vi.fn(),
}));
vi.mock('../api/recordStore', () => ({
  listRecords: vi.fn(),
  listRecentRecords: vi.fn(),
}));

const LUNCH: RecordEntry = {
  id: '1',
  type: 'expense',
  occurredAt: '2026-10-19',
  title: '점심',
  memo: null,
  tags: [],
  fields: { amount: 12500, category: '식비' },
};
const CAFE: RecordEntry = {
  id: '2',
  type: 'review',
  occurredAt: '2026-10-16',
  title: '동네 로스터리',
  memo: null,
  tags: [],
  fields: { rating: 4, targetKind: '장소' },
};

function renderOverview() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RecordsOverview />
    </QueryClientProvider>,
  );
}

describe('RecordsOverview', () => {
  beforeEach(() => {
    vi.mocked(listRecords).mockReset();
    vi.mocked(listRecentRecords).mockReset();
    vi.mocked(getUserSettings).mockResolvedValue({ hiddenTypes: [] });
  });
  afterEach(() => cleanup());

  it('이번 달 카드에 타입별 값, 최근 기록에 한 줄씩 보여 준다', async () => {
    vi.mocked(listRecords).mockResolvedValue([LUNCH, CAFE]);
    vi.mocked(listRecentRecords).mockResolvedValue([LUNCH, CAFE]);
    renderOverview();

    // 카드의 합계와 목록의 금액이 같은 글자라 개수로 확인한다
    expect(await screen.findAllByText('-12,500원')).toHaveLength(2);
    expect(screen.getByText('1건')).toBeTruthy();
    expect(screen.getByText('점심 · 식비')).toBeTruthy();
    expect(screen.getByText('가계부 · 10.19 (월)')).toBeTruthy();
    expect(screen.getByText('★ 4.0')).toBeTruthy();
  });

  it('최근 기록 한 줄은 그 기록의 상세로 가는 링크', async () => {
    vi.mocked(listRecords).mockResolvedValue([LUNCH]);
    vi.mocked(listRecentRecords).mockResolvedValue([LUNCH]);
    renderOverview();

    const link = await screen.findByRole('link', { name: /점심 · 식비/ });
    expect(link.getAttribute('href')).toBe('/records/1');
  });

  it('이번 달 기록은 오늘이 속한 달의 첫날~말일로 조회한다', async () => {
    vi.mocked(listRecords).mockResolvedValue([]);
    vi.mocked(listRecentRecords).mockResolvedValue([]);
    renderOverview();

    await screen.findByText('기록이 없어요');
    const [from, to] = vi.mocked(listRecords).mock.calls[0];
    expect(from).toMatch(/^\d{4}-\d{2}-01$/);
    expect(to.slice(0, 7)).toBe(from.slice(0, 7));
  });

  it('기록이 하나도 없으면 빈 상태, 카드는 0원·0건으로 남긴다', async () => {
    vi.mocked(listRecords).mockResolvedValue([]);
    vi.mocked(listRecentRecords).mockResolvedValue([]);
    renderOverview();

    expect(await screen.findByText('기록이 없어요')).toBeTruthy();
    expect(screen.getByText('0원')).toBeTruthy();
    expect(screen.getByText('0건')).toBeTruthy();
    expect(screen.getByRole('button', { name: '기록 추가하기' })).toBeTruthy();
  });

  it('설정에서 끈 타입은 카드와 최근 기록에서 빠진다', async () => {
    vi.mocked(getUserSettings).mockResolvedValue({ hiddenTypes: ['review'] });
    vi.mocked(listRecords).mockResolvedValue([LUNCH, CAFE]);
    vi.mocked(listRecentRecords).mockResolvedValue([LUNCH, CAFE]);
    renderOverview();

    // 기록이 그려진 뒤(점심이 보인 뒤)에 확인한다. 그 전에는 후기도 원래 안 보여서 검사가 의미 없다
    expect(await screen.findByText('점심 · 식비')).toBeTruthy();
    // 설정을 불러오기 전에는 모두 켜진 것으로 그리므로, 후기가 사라질 때까지 기다린다
    await waitFor(() => expect(screen.queryByText('동네 로스터리')).toBeNull());
    expect(screen.queryByText('이번 달 작성')).toBeNull();
    expect(screen.getByText('이번 달 지출')).toBeTruthy();
  });

  it('불러오지 못하면 안내와 다시 시도 버튼', async () => {
    vi.mocked(listRecords).mockRejectedValue(new Error('네트워크 오류'));
    vi.mocked(listRecentRecords).mockResolvedValue([]);
    renderOverview();

    expect((await screen.findByRole('alert')).textContent).toContain(
      '기록을 불러오지 못했어요',
    );
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy();
  });
});
