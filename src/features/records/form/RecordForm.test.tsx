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
import { toLocalDateString } from '@/shared/date/toLocalDateString';
import { createRecord } from '../api/recordStore';
import RecordForm from './RecordForm';

// 실제 Supabase·라우터 대신 가짜. 이 테스트는 "폼이 무엇을 검사하고 무엇을 넘기는지"만 본다
vi.mock('../api/recordStore', () => ({ createRecord: vi.fn() }));
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RecordForm type='expense' />
    </QueryClientProvider>,
  );
}

function fillRequired() {
  fireEvent.change(screen.getByLabelText('금액'), {
    target: { value: '12,500' },
  });
  fireEvent.click(screen.getByRole('radio', { name: '식비' }));
  fireEvent.change(screen.getByLabelText('제목'), {
    target: { value: '점심' },
  });
}

describe('RecordForm (가계부)', () => {
  beforeEach(() => {
    vi.mocked(createRecord).mockReset();
    replace.mockReset();
  });
  // 전역 정리(globals)를 켜지 않아서 테스트마다 그린 화면을 직접 지운다.
  // jest-dom 검사(toHaveAttribute 등)는 라이브러리를 늘리지 않으려고 쓰지 않고 기본 expect로 확인한다
  afterEach(() => cleanup());

  it('필수 칸을 비우고 저장하면 칸마다 오류가 뜨고 저장하지 않는다', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(screen.getByLabelText('금액').getAttribute('aria-invalid')).toBe(
        'true',
      ),
    );
    expect(screen.getByLabelText('제목').getAttribute('aria-invalid')).toBe(
      'true',
    );
    expect(createRecord).not.toHaveBeenCalled();
  });

  it('채워서 저장하면 변환된 값으로 저장하고 홈으로 replace', async () => {
    vi.mocked(createRecord).mockImplementation(async (input) => ({
      ...input,
      id: 'new-id',
    }));
    renderForm();
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(vi.mocked(createRecord).mock.calls[0][0]).toEqual({
      type: 'expense',
      occurredAt: toLocalDateString(new Date()),
      title: '점심',
      // 빈 메모는 '' 가 아니라 null, 빈 결제수단은 아예 빠진다
      memo: null,
      tags: [],
      // 표시용 쉼표가 붙은 '12,500'이 숫자 12500으로 바뀌어 들어간다
      fields: { amount: 12500, category: '식비' },
    });
  });

  it('저장에 실패하면 안내 문구를 보여 주고 이동하지 않는다', async () => {
    vi.mocked(createRecord).mockRejectedValue(new Error('네트워크 오류'));
    renderForm();
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      '저장하지 못했어요',
    );
    expect(replace).not.toHaveBeenCalled();
  });
});
