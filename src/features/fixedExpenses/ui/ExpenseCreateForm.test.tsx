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
import { createRecord } from '@/features/records/api/recordStore';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import { useToastStore } from '@/shared/toast/toastStore';
import { createFixedExpense } from '../api/fixedExpenseStore';
import ExpenseCreateForm from './ExpenseCreateForm';

// 기록 저장·고정지출 저장은 저장소의 일이라 가짜로. 이 테스트는 "체크하면 무엇을 넘기는지"만 본다
vi.mock('@/features/records/api/recordStore', () => ({
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
}));
vi.mock('../api/fixedExpenseStore', () => ({
  createFixedExpense: vi.fn(),
  listFixedExpenses: vi.fn().mockResolvedValue([]),
}));
// Radix 체크박스가 크기를 재려고 ResizeObserver를 쓰는데 jsdom에는 없다 (RoutineForm.test와 같은 가짜)
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ExpenseCreateForm date='2026-10-05' doneHref='/' />
    </QueryClientProvider>,
  );
}

function fillAndSave({ isFixed }: { isFixed: boolean }) {
  fireEvent.change(screen.getByLabelText('금액'), {
    target: { value: '55,000' },
  });
  if (isFixed) {
    fireEvent.click(screen.getByRole('checkbox', { name: '고정지출' }));
  }
  fireEvent.click(screen.getByRole('radio', { name: '생활' }));
  fireEvent.change(screen.getByLabelText('제목'), {
    target: { value: '통신비' },
  });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
}

describe('ExpenseCreateForm (가계부 쓰기 + 고정지출 체크)', () => {
  beforeEach(() => {
    vi.mocked(createRecord).mockReset();
    vi.mocked(createRecord).mockImplementation(
      async (input) =>
        ({
          ...input,
          id: 'record-1',
        }) as RecordEntry,
    );
    vi.mocked(createFixedExpense).mockReset();
    replace.mockReset();
    useToastStore.setState({ toast: null });
  });
  afterEach(() => cleanup());

  it('체크하지 않으면 기록만 저장한다', async () => {
    renderForm();
    fillAndSave({ isFixed: false });

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(createRecord).toHaveBeenCalled();
    expect(createFixedExpense).not.toHaveBeenCalled();
  });

  it('체크하면 기록 날짜의 "일"로 매달 반복 규칙을 만들고, 이번 달 몫은 이 기록이라고 알린다', async () => {
    vi.mocked(createFixedExpense).mockResolvedValue({} as never);
    renderForm();
    fillAndSave({ isFixed: true });

    await waitFor(() => expect(createFixedExpense).toHaveBeenCalled());
    const [input, options] = vi.mocked(createFixedExpense).mock.calls[0];
    expect(input).toEqual({
      name: '통신비',
      amount: 55000,
      category: '생활',
      schedule: { kind: 'monthly', day: 5 },
    });
    expect(options.recordedOn).toBe('2026-10-05');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(useToastStore.getState().toast?.message).toBe(
      '매달 5일에 자동으로 기록돼요',
    );
  });

  it('고정지출 등록이 실패해도 기록은 저장되고 화면은 넘어가며, 실패를 알린다', async () => {
    vi.mocked(createFixedExpense).mockRejectedValue(new Error('offline'));
    renderForm();
    fillAndSave({ isFixed: true });

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(createRecord).toHaveBeenCalled();
    expect(useToastStore.getState().toast).toMatchObject({
      message: '기록은 저장했지만 고정지출로 등록하지 못했어요',
      tone: 'error',
    });
  });
});
