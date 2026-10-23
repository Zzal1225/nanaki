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
import { setRoutineCheck } from '@/features/records/api/recordStore';
import type { DayRoutine } from '../progress';
import type { Routine } from '../schema/routine';
import RoutineChecklist from './RoutineChecklist';

vi.mock('@/features/records/api/recordStore', () => ({
  setRoutineCheck: vi.fn(),
}));

const WATER: Routine = {
  id: '11111111-1111-4111-8111-111111111111',
  name: '물 마시기',
  startDate: '2026-10-01',
  schedule: { kind: 'weekly', days: [0, 1, 2, 3, 4, 5, 6] },
  goal: { kind: 'count', target: 8, unit: '잔' },
  endedOn: null,
  remindAt: null,
};
const STRETCH: Routine = {
  ...WATER,
  id: '22222222-2222-4222-8222-222222222222',
  name: '스트레칭',
  goal: { kind: 'check' },
};

function renderList(items: DayRoutine[], isLocked = false) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RoutineChecklist date='2026-10-21' items={items} isLocked={isLocked} />
    </QueryClientProvider>,
  );
}

describe('RoutineChecklist', () => {
  beforeEach(() => {
    vi.mocked(setRoutineCheck).mockReset();
    vi.mocked(setRoutineCheck).mockResolvedValue();
  });
  afterEach(() => cleanup());

  it('체크형: 누르면 1로 저장, 완료된 것을 누르면 0(체크 풀기)', async () => {
    renderList([
      { routine: STRETCH, count: 0, target: 1, isDone: false },
      {
        routine: { ...STRETCH, id: 'done', name: '영양제' },
        count: 1,
        target: 1,
        isDone: true,
      },
    ]);
    const stretch = screen.getByRole('checkbox', { name: '스트레칭 완료' });
    expect(stretch.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(stretch);
    await waitFor(() => expect(setRoutineCheck).toHaveBeenCalledTimes(1));
    expect(vi.mocked(setRoutineCheck).mock.calls[0][0]).toMatchObject({
      routineId: STRETCH.id,
      routineName: '스트레칭',
      date: '2026-10-21',
      count: 1,
      target: 1,
    });

    fireEvent.click(screen.getByRole('checkbox', { name: '영양제 완료' }));
    await waitFor(() => expect(setRoutineCheck).toHaveBeenCalledTimes(2));
    expect(vi.mocked(setRoutineCheck).mock.calls[1][0].count).toBe(0);
  });

  it('횟수형: "3/8잔"과 +/− (0이면 빼기 막힘)', async () => {
    renderList([{ routine: WATER, count: 3, target: 8, isDone: false }]);
    expect(screen.getByText('3/8잔')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: '물 마시기 한 번 더하기' }),
    );
    await waitFor(() => expect(setRoutineCheck).toHaveBeenCalled());
    expect(vi.mocked(setRoutineCheck).mock.calls[0][0]).toMatchObject({
      count: 4,
      target: 8,
      unit: '잔',
    });
    cleanup();

    renderList([{ routine: WATER, count: 0, target: 8, isDone: false }]);
    expect(
      (
        screen.getByRole('button', {
          name: '물 마시기 한 번 빼기',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('미래 날짜는 목록만 보이고 체크를 막는다', () => {
    renderList(
      [{ routine: STRETCH, count: 0, target: 1, isDone: false }],
      true,
    );
    expect(
      (
        screen.getByRole('checkbox', {
          name: '스트레칭 완료',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      screen.getByText('아직 오지 않은 날은 체크할 수 없어요'),
    ).toBeTruthy();
  });
});
