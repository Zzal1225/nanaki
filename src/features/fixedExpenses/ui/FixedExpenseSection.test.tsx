// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteFixedExpense,
  listFixedExpenses,
  updateFixedExpense,
} from '../api/fixedExpenseStore';
import type { FixedExpense } from '../schema/fixedExpense';
import FixedExpenseSection from './FixedExpenseSection';

vi.mock('../api/fixedExpenseStore', () => ({
  listFixedExpenses: vi.fn(),
  updateFixedExpense: vi.fn(),
  deleteFixedExpense: vi.fn(),
}));

// 수정 시트의 Radix 칩(토글 그룹)이 크기를 재려고 ResizeObserver를 쓰는데 jsdom에는 없다 (RoutineForm.test와 같은 가짜)
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const TODAY = '2026-10-23';

const PHONE: FixedExpense = {
  id: '11111111-1111-4111-8111-111111111111',
  name: '통신비',
  amount: 55000,
  category: '생활',
  paymentMethod: '카드',
  schedule: { kind: 'monthly', day: 5 },
  startDate: '2026-09-01',
  lastRecordedOn: '2026-10-05',
};
const GYM: FixedExpense = {
  id: '22222222-2222-4222-8222-222222222222',
  name: '헬스장',
  amount: 60000,
  category: '생활',
  schedule: { kind: 'monthly', day: 24 },
  startDate: '2026-09-01',
  lastRecordedOn: '2026-09-24',
};

function renderSection(canEdit = true) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <FixedExpenseSection today={TODAY} canEdit={canEdit} />
    </QueryClientProvider>,
  );
}

describe('FixedExpenseSection', () => {
  beforeEach(() => {
    vi.mocked(listFixedExpenses).mockReset();
    vi.mocked(listFixedExpenses).mockResolvedValue([PHONE, GYM]);
    vi.mocked(updateFixedExpense).mockReset();
    vi.mocked(deleteFixedExpense).mockReset();
  });
  afterEach(() => cleanup());

  it('줄마다 결제일·상태·금액, 아래에 이번 달 합계 (시안 18)', async () => {
    renderSection();
    const phone = await screen.findByRole('button', { name: /통신비/ });
    expect(phone.textContent).toContain('매달 5일');
    expect(phone.textContent).toContain('기록됨');
    expect(phone.textContent).toContain('-55,000원');
    expect(
      screen.getByRole('button', { name: /헬스장/ }).textContent,
    ).toContain('1일 남음');
    expect(screen.getByText(/이번 달 고정지출 -115,000원/)).toBeTruthy();
  });

  it('줄을 누르면 수정, 해지는 확인 뒤 삭제', async () => {
    vi.mocked(deleteFixedExpense).mockResolvedValue();
    renderSection();
    fireEvent.click(await screen.findByRole('button', { name: /헬스장/ }));
    const sheet = await screen.findByRole('dialog', { name: '고정지출 수정' });
    expect(
      (within(sheet).getByLabelText('이름') as HTMLInputElement).value,
    ).toBe('헬스장');

    fireEvent.click(within(sheet).getByRole('button', { name: '해지' }));
    const confirm = await screen.findByRole('alertdialog', {
      name: '헬스장을 해지할까요?',
    });
    fireEvent.click(within(confirm).getByRole('button', { name: '해지' }));

    await waitFor(() =>
      expect(deleteFixedExpense).toHaveBeenCalledWith(GYM.id),
    );
  });

  it('수정: 바꾼 값으로 저장, 빈 이름은 저장 전에 오류', async () => {
    vi.mocked(updateFixedExpense).mockResolvedValue(PHONE);
    renderSection();
    fireEvent.click(await screen.findByRole('button', { name: /통신비/ }));
    const sheet = await screen.findByRole('dialog', { name: '고정지출 수정' });

    fireEvent.change(within(sheet).getByLabelText('이름'), {
      target: { value: '' },
    });
    fireEvent.click(within(sheet).getByRole('button', { name: '저장' }));
    expect(await within(sheet).findByText('이름을 입력해 주세요')).toBeTruthy();
    expect(updateFixedExpense).not.toHaveBeenCalled();

    fireEvent.change(within(sheet).getByLabelText('이름'), {
      target: { value: '휴대폰' },
    });
    fireEvent.change(within(sheet).getByLabelText('금액'), {
      target: { value: '49,000' },
    });
    fireEvent.click(within(sheet).getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(updateFixedExpense).toHaveBeenCalledWith(PHONE.id, {
        name: '휴대폰',
        amount: 49000,
        category: '생활',
        paymentMethod: '카드',
        schedule: { kind: 'monthly', day: 5 },
      }),
    );
  });

  it('오프라인(canEdit 꺼짐)이면 줄을 눌러도 열리지 않는다 (보기만)', async () => {
    renderSection(false);
    const phone = (await screen.findByRole('button', {
      name: /통신비/,
    })) as HTMLButtonElement;
    expect(phone.disabled).toBe(true);
  });
});
