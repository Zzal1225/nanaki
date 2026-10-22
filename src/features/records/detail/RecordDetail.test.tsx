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
import { useToastStore } from '@/shared/toast/toastStore';
import { deleteRecord, getRecord } from '../api/recordStore';
import type { RecordEntry } from '../schema/recordEntry';
import RecordDetail from './RecordDetail';

vi.mock('../api/recordStore', () => ({
  getRecord: vi.fn(),
  deleteRecord: vi.fn(),
  restoreRecord: vi.fn(),
}));
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const LUNCH: RecordEntry = {
  id: 'lunch-id',
  type: 'expense',
  occurredAt: '2026-10-16',
  title: '점심',
  memo: '맛있었다',
  tags: ['회사'],
  fields: { amount: 12500, category: '식비' },
};

function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RecordDetail id='lunch-id' />
    </QueryClientProvider>,
  );
}

describe('RecordDetail', () => {
  beforeEach(() => {
    vi.mocked(getRecord).mockReset();
    vi.mocked(deleteRecord).mockReset();
    replace.mockReset();
    useToastStore.setState({ toast: null });
  });
  afterEach(() => cleanup());

  it('칩·제목·금액과 표(날짜, 필드, 태그, 메모)를 보여 준다', async () => {
    vi.mocked(getRecord).mockResolvedValue(LUNCH);
    renderDetail();

    expect(await screen.findByRole('heading', { name: '점심' })).toBeTruthy();
    // 배지는 타입 이름만 (분류는 표에 있다)
    expect(screen.getByText('가계부')).toBeTruthy();
    expect(screen.queryByText('가계부 · 식비')).toBeNull();
    expect(screen.getByText('-12,500원')).toBeTruthy();
    expect(screen.getByText('2026. 10. 16 (금)')).toBeTruthy();
    expect(screen.getByText('#회사')).toBeTruthy();
    expect(screen.getByText('맛있었다')).toBeTruthy();
  });

  // 크게 보여 준 금액은 표에서 빼고, 비운 선택 칸(결제수단)은 줄을 그리지 않는다
  it('대표 값(금액)과 비운 선택 칸은 표에 없다', async () => {
    vi.mocked(getRecord).mockResolvedValue(LUNCH);
    renderDetail();

    await screen.findByRole('heading', { name: '점심' });
    const labels = screen.getAllByRole('term').map((dt) => dt.textContent);
    expect(labels).toEqual(['날짜', '분류', '태그', '메모']);
  });

  it('수정 버튼은 그 기록의 수정 화면으로', async () => {
    vi.mocked(getRecord).mockResolvedValue(LUNCH);
    renderDetail();

    const edit = await screen.findByRole('link', { name: '수정' });
    expect(edit.getAttribute('href')).toBe('/records/edit?id=lunch-id');
  });

  it('없는 기록(지웠거나 남의 기록)이면 안내', async () => {
    vi.mocked(getRecord).mockResolvedValue(null);
    renderDetail();

    expect(await screen.findByText('기록을 찾을 수 없어요.')).toBeTruthy();
  });

  // 시안: 확인 창 없이 바로 지우고 홈으로, 되돌리기 토스트
  it('⋯ → 삭제를 고르면 바로 지우고 홈으로 replace, 되돌리기 토스트', async () => {
    vi.mocked(getRecord).mockResolvedValue(LUNCH);
    vi.mocked(deleteRecord).mockResolvedValue();
    renderDetail();

    const more = await screen.findByRole('button', { name: '더보기' });
    // Radix 메뉴는 테스트 환경에서 마우스로 열기가 불안정해서 키보드(Enter)로 연다
    fireEvent.keyDown(more, { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: '삭제' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    // mutationFn에는 TanStack Query가 두 번째 인자를 함께 넘겨서 첫 번째 인자만 본다
    expect(vi.mocked(deleteRecord).mock.calls[0][0]).toBe('lunch-id');
    expect(useToastStore.getState().toast?.action?.label).toBe('되돌리기');
  });

  it('지우기에 실패하면 이동하지 않고 안내 토스트', async () => {
    vi.mocked(getRecord).mockResolvedValue(LUNCH);
    vi.mocked(deleteRecord).mockRejectedValue(new Error('네트워크 오류'));
    renderDetail();

    const more = await screen.findByRole('button', { name: '더보기' });
    fireEvent.keyDown(more, { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: '삭제' }));

    await waitFor(() =>
      expect(useToastStore.getState().toast?.message).toContain(
        '삭제하지 못했어요',
      ),
    );
    expect(replace).not.toHaveBeenCalled();
  });

  // PC는 ⋯ 없이 삭제 버튼이 밖에 있다 (테스트 환경은 CSS가 없어 모바일 메뉴 버튼과 함께 보인다)
  it('PC 삭제 버튼으로도 바로 지운다', async () => {
    vi.mocked(getRecord).mockResolvedValue(LUNCH);
    vi.mocked(deleteRecord).mockResolvedValue();
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: '삭제' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });
});
