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
import { createRoutine, updateRoutine } from '../api/routineStore';
import type { Routine } from '../schema/routine';
import RoutineForm from './RoutineForm';

// 실제 Supabase·라우터 대신 가짜. "폼이 무엇을 검사하고 무엇을 넘기는지"만 본다
vi.mock('../api/routineStore', () => ({
  createRoutine: vi.fn(),
  updateRoutine: vi.fn(),
}));
// Radix 라디오 그룹(SegmentedControl)이 크기를 재려고 ResizeObserver를 쓰는데 jsdom에는 없다.
// 이 테스트는 크기와 상관없으니 아무것도 하지 않는 가짜로 채운다
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

function renderForm(
  props: Parameters<typeof RoutineForm>[0] = {
    mode: 'create',
    today: '2026-10-21',
    doneHref: '/',
  },
) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RoutineForm {...props} />
    </QueryClientProvider>,
  );
}

function save() {
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
}

describe('RoutineForm', () => {
  beforeEach(() => {
    vi.mocked(createRoutine).mockReset();
    vi.mocked(createRoutine).mockImplementation(async (values) => ({
      ...values,
      id: 'new-id',
      endedOn: null,
      remindAt: null,
    }));
    vi.mocked(updateRoutine).mockReset();
    replace.mockReset();
  });
  afterEach(() => cleanup());

  it('이름만 쓰면 매일·체크 루틴으로 만들고 돌아간다 (기본값)', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText('이름'), {
      target: { value: '스트레칭' },
    });
    save();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(vi.mocked(createRoutine).mock.calls[0][0]).toMatchObject({
      name: '스트레칭',
      startDate: '2026-10-21',
      schedule: { kind: 'weekly', days: [0, 1, 2, 3, 4, 5, 6] },
      goal: { kind: 'check' },
    });
  });

  it('요일을 모두 끄면 저장하지 않고 이유를 보여 준다', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText('이름'), {
      target: { value: '스트레칭' },
    });
    for (const day of ['일', '월', '화', '수', '목', '금', '토']) {
      fireEvent.click(screen.getByRole('button', { name: day }));
    }
    save();

    expect(
      await screen.findByText('요일을 하나 이상 골라 주세요'),
    ).toBeTruthy();
    expect(createRoutine).not.toHaveBeenCalled();
  });

  it('매달 31일 + 하루 8잔 (조사는 단위에 맞게: 8잔을)', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText('이름'), {
      target: { value: '물 마시기' },
    });
    fireEvent.click(screen.getByRole('radio', { name: '매달' }));
    fireEvent.change(screen.getByLabelText('매달 며칠'), {
      target: { value: '31' },
    });
    fireEvent.click(screen.getByRole('radio', { name: '횟수' }));
    fireEvent.change(screen.getByLabelText('하루 횟수'), {
      target: { value: '8' },
    });
    fireEvent.change(screen.getByLabelText('단위 (선택)'), {
      target: { value: '잔' },
    });
    expect(screen.getByText('하루 8잔을 채우면 완료돼요')).toBeTruthy();
    save();

    await waitFor(() => expect(createRoutine).toHaveBeenCalled());
    expect(vi.mocked(createRoutine).mock.calls[0][0]).toMatchObject({
      schedule: { kind: 'monthly', day: 31 },
      goal: { kind: 'count', target: 8, unit: '잔' },
    });
  });

  it('매달을 눌렀다가 돌아와도 골라 둔 요일이 남아 있다', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: '일' }));
    fireEvent.click(screen.getByRole('radio', { name: '매달' }));
    fireEvent.click(screen.getByRole('radio', { name: '요일 선택' }));
    expect(
      screen.getByRole('button', { name: '일' }).getAttribute('aria-pressed'),
    ).toBe('false');
    expect(
      screen.getByRole('button', { name: '월' }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('고치기: 저장된 값으로 채우고, 바꾼 값으로 updateRoutine', async () => {
    const routine: Routine = {
      id: 'r1',
      name: '영양제',
      startDate: '2026-10-01',
      schedule: { kind: 'weekly', days: [1, 3, 5] },
      goal: { kind: 'check' },
      endedOn: null,
      remindAt: null,
    };
    vi.mocked(updateRoutine).mockResolvedValue(routine);
    renderForm({ mode: 'edit', routine, doneHref: '/back' });
    expect(screen.getByRole('heading', { name: '루틴 수정' })).toBeTruthy();
    expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe(
      '영양제',
    );

    fireEvent.click(screen.getByRole('button', { name: '토' }));
    save();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/back'));
    expect(vi.mocked(updateRoutine).mock.calls[0]).toEqual([
      'r1',
      expect.objectContaining({
        schedule: { kind: 'weekly', days: [1, 3, 5, 6] },
      }),
    ]);
  });
});
