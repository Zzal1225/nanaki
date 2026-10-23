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
import { listRecordsOfType } from '@/features/records/api/recordStore';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import { getBudget, saveBudget } from '../api/budgetStore';
import BudgetScreen from './BudgetScreen';

vi.mock('@/features/records/api/recordStore', () => ({
  listRecordsOfType: vi.fn(),
}));
vi.mock('../api/budgetStore', () => ({
  getBudget: vi.fn(),
  saveBudget: vi.fn(),
}));

// 지난 달(오늘보다 앞)로 고정해 남은 날 계산이 테스트 날짜에 흔들리지 않게 한다
const MONTH = '2026-09';

function expense(id: string, amount: number, category: string): RecordEntry {
  return {
    id,
    type: 'expense',
    occurredAt: '2026-09-10',
    title: id,
    memo: null,
    tags: [],
    fields: { amount, category },
  };
}

const BUDGET = {
  month: MONTH,
  total: 600000,
  categories: { 식비: 150000, 카페: 50000 },
};

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <BudgetScreen month={MONTH} />
    </QueryClientProvider>,
  );
}

describe('BudgetScreen', () => {
  beforeEach(() => {
    vi.mocked(listRecordsOfType).mockResolvedValue([
      expense('점심', 156700, '식비'),
      expense('커피', 20000, '카페'),
      expense('택시', 9000, '교통'),
    ]);
    vi.mocked(getBudget).mockResolvedValue({
      budget: BUDGET,
      sourceMonth: MONTH,
    });
    vi.mocked(saveBudget).mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('전체 예산·쓴 돈, 넘은 분류는 아이콘과 "초과" 글자, 예산 없는 분류는 "예산 없음"', async () => {
    renderScreen();

    expect(await screen.findByText('600,000원')).toBeTruthy();
    expect(screen.getByText(/-185,700원 썼어요/)).toBeTruthy();
    // 색만으로 알리지 않는다: 넘은 금액을 글자로
    expect(screen.getByText('6,700원 초과')).toBeTruthy();
    expect(screen.getByText(/예산 없음/)).toBeTruthy();
    expect(screen.queryByText(/이어받았어요/)).toBeNull();
  });

  it('이어받은 예산이면 알린다', async () => {
    vi.mocked(getBudget).mockResolvedValue({
      budget: BUDGET,
      sourceMonth: '2026-08',
    });
    renderScreen();

    expect(
      await screen.findByText(
        '8월 예산을 이어받았어요. 바꾸면 9월 예산으로 저장돼요.',
      ),
    ).toBeTruthy();
  });

  it('전체 예산 수정: 이 달 줄로 저장하고 시트를 닫는다 (분류별 예산은 그대로)', async () => {
    vi.mocked(saveBudget).mockImplementation(async (budget) => ({
      budget,
      sourceMonth: budget.month,
    }));
    renderScreen();

    fireEvent.click(
      await screen.findByRole('button', { name: /전체 예산 수정/ }),
    );
    const input = await screen.findByLabelText('전체 예산');
    fireEvent.change(input, { target: { value: '500,000' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(vi.mocked(saveBudget).mock.calls[0][0]).toEqual({
      ...BUDGET,
      total: 500000,
    });
  });

  it('분류별 편집: 빈 칸은 예산에서 빠지고, 돈을 쓴 직접 입력 분류도 칸이 있다', async () => {
    vi.mocked(listRecordsOfType).mockResolvedValue([
      expense('운동복', 30000, '운동복'),
    ]);
    vi.mocked(saveBudget).mockImplementation(async (budget) => ({
      budget,
      sourceMonth: budget.month,
    }));
    renderScreen();

    fireEvent.click(
      await screen.findByRole('button', { name: '분류별 예산 편집' }),
    );
    fireEvent.change(await screen.findByLabelText('카페'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('운동복'), {
      target: { value: '40000' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(saveBudget).toHaveBeenCalled());
    expect(vi.mocked(saveBudget).mock.calls[0][0].categories).toEqual({
      식비: 150000,
      운동복: 40000,
    });
  });

  it('저장 실패: 시트를 닫지 않고 알린다 (입력한 값이 남는다)', async () => {
    vi.mocked(saveBudget).mockRejectedValue(new Error('network'));
    renderScreen();

    fireEvent.click(
      await screen.findByRole('button', { name: /전체 예산 수정/ }),
    );
    fireEvent.change(await screen.findByLabelText('전체 예산'), {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(
      await screen.findByText(/저장하지 못했어요/, undefined, {
        timeout: 2000,
      }),
    ).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect((screen.getByLabelText('전체 예산') as HTMLInputElement).value).toBe(
      '1',
    );
  });

  it('오프라인: 보기는 되고 수정 버튼은 비활성 + 안내', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderScreen();

    expect(await screen.findByText('600,000원')).toBeTruthy();
    expect(screen.getByText(/연결되면 예산을 바꿀 수 있어요/)).toBeTruthy();
    expect(
      (
        screen.getByRole('button', {
          name: /전체 예산 수정/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole('button', {
          name: '분류별 예산 편집',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
