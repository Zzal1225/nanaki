// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listRecords } from '@/features/records/api/recordStore';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import { getUserSettings } from '@/features/settings/api/settingsStore';
import HomeCalendar from './HomeCalendar';

// 진짜 Next.js처럼 history.replaceState로 주소가 바뀌면 useSearchParams가 새 값을 주게 흉내 낸다.
// 이게 없으면 칸을 눌러도 화면이 그대로라 "주소가 상태를 기억한다"는 흐름을 확인할 수 없다
vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  const listeners = new Set<() => void>();
  const replaceState = window.history.replaceState.bind(window.history);
  window.history.replaceState = (...args) => {
    replaceState(...args);
    listeners.forEach((listener) => listener());
  };
  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  return {
    useSearchParams: () =>
      new URLSearchParams(
        useSyncExternalStore(subscribe, () => window.location.search),
      ),
  };
});
// 오늘을 고정한다. 진짜 오늘을 쓰면 날짜마다 테스트 결과가 달라진다
vi.mock('@/shared/date/useToday', () => ({ useToday: () => '2026-10-21' }));
vi.mock('@/features/records/api/recordStore', () => ({ listRecords: vi.fn() }));
// 설정(숨긴 타입)도 가짜. 기본은 아무것도 숨기지 않음
vi.mock('@/features/settings/api/settingsStore', () => ({
  getUserSettings: vi.fn(),
  updateHiddenTypes: vi.fn(),
}));

const BASE = { memo: null, tags: [] };
const LUNCH: RecordEntry = {
  ...BASE,
  id: '1',
  type: 'expense',
  occurredAt: '2026-10-21',
  title: '점심',
  fields: { amount: 12500, category: '식비' },
};
const CAFE: RecordEntry = {
  ...BASE,
  id: '2',
  type: 'review',
  occurredAt: '2026-10-21',
  title: '동네 로스터리',
  fields: { rating: 4, targetKind: '장소' },
};

function renderCalendar(search = '') {
  window.history.replaceState(null, '', `/${search}`);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <HomeCalendar />
    </QueryClientProvider>,
  );
}

function cellOf(label: RegExp) {
  return within(screen.getByRole('grid')).getByRole('button', { name: label });
}

describe('HomeCalendar', () => {
  beforeEach(() => {
    vi.mocked(listRecords).mockReset();
    vi.mocked(listRecords).mockResolvedValue([LUNCH, CAFE]);
    vi.mocked(getUserSettings).mockResolvedValue({ hiddenTypes: [] });
  });

  it('설정에서 끈 타입은 칸의 점·하루 요약에서 빠진다', async () => {
    vi.mocked(getUserSettings).mockResolvedValue({ hiddenTypes: ['review'] });
    renderCalendar();

    expect(
      await screen.findByRole('button', {
        name: '10월 21일 (수), 가계부 기록',
      }),
    ).toBeDefined();
    expect(screen.getByText('가계부 1건')).toBeDefined();
    expect(screen.queryByText('후기 1건')).toBeNull();
  });
  afterEach(() => cleanup());

  it('주소에 날짜가 없으면 오늘을 고른 채로 열고, 그날 요약을 타입별 한 줄로', async () => {
    renderCalendar();

    expect(screen.getByRole('heading', { name: '2026년 10월' })).toBeDefined();
    expect(cellOf(/^10월 21일 \(수\)/).getAttribute('aria-current')).toBe(
      'date',
    );
    // 점은 색이라 이름으로도 알려 준다
    expect(
      await screen.findByRole('button', {
        name: '10월 21일 (수), 가계부·후기 기록',
      }),
    ).toBeDefined();
    expect(screen.getByText('가계부 1건')).toBeDefined();
    expect(screen.getByText('동네 로스터리 ★ 4.0')).toBeDefined();
    expect(listRecords).toHaveBeenCalledWith('2026-10-01', '2026-10-31');
  });

  it('칸을 누르면 주소의 날짜가 바뀌고, 기록이 없는 날은 빈 상태', async () => {
    renderCalendar();
    await screen.findByText('가계부 1건');

    fireEvent.click(cellOf(/^10월 16일/));

    expect(window.location.search).toBe('?date=2026-10-16');
    expect(
      screen.getByRole('heading', { name: '10월 16일 금요일' }),
    ).toBeDefined();
    expect(screen.getByText('기록이 없어요')).toBeDefined();
  });

  it('방향키로 옮기면 포커스가 따라가고, PageDown은 다음 달 같은 날', async () => {
    renderCalendar('?date=2026-10-31');
    const start = cellOf(/^10월 31일/);
    start.focus();

    fireEvent.keyDown(start, { key: 'ArrowRight' });
    // 달 경계를 넘으면 보이는 달도 바뀐다
    expect(screen.getByRole('heading', { name: '2026년 11월' })).toBeDefined();
    expect(document.activeElement).toBe(cellOf(/^11월 1일/));

    fireEvent.keyDown(document.activeElement!, { key: 'PageDown' });
    expect(window.location.search).toBe('?date=2026-12-01');
    expect(document.activeElement).toBe(cellOf(/^12월 1일/));
    expect(cellOf(/^12월 1일/).tabIndex).toBe(0);
  });

  it('‹ › 버튼은 달을 옮기고, 고른 일은 유지한다 (없는 날은 말일로)', () => {
    renderCalendar('?date=2026-10-31');

    fireEvent.click(screen.getByRole('button', { name: '2026년 11월로' }));
    expect(window.location.search).toBe('?date=2026-11-30');
  });

  it('오늘 아이콘에 오늘 날짜가 적혀 있고, 누르면 오늘로 돌아온다', () => {
    renderCalendar('?date=2026-08-03');
    const todayButton = screen.getByRole('button', {
      name: '오늘(10월 21일 (수))로',
    });
    expect(todayButton.textContent).toBe('21');

    fireEvent.click(todayButton);

    expect(window.location.search).toBe('?date=2026-10-21');
    expect(screen.getByRole('heading', { name: '2026년 10월' })).toBeDefined();
  });

  it('하루 요약에는 날짜를 옮기는 버튼이 없다 (날짜는 칸을 눌러 고른다)', () => {
    renderCalendar();
    expect(screen.queryByRole('button', { name: '전날' })).toBeNull();
    expect(screen.queryByRole('button', { name: '다음 날' })).toBeNull();
  });

  it('타입 줄을 누르면 그날 기록이 펼쳐진다', async () => {
    renderCalendar();
    const row = await screen.findByRole('button', { name: /가계부 1건/ });
    expect(row.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(row);

    expect(row.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('link', { name: /점심 · 식비/ })).toBeDefined();
  });

  it('주소 값이 틀리면 오늘로 (화면이 깨지지 않는다)', () => {
    renderCalendar('?date=2026-02-30');
    expect(cellOf(/^10월 21일/).getAttribute('aria-current')).toBe('date');
    expect(cellOf(/^10월 21일/).tabIndex).toBe(0);
  });

  // 주 보기를 뺀 뒤에도 예전에 저장·공유한 주소가 깨지지 않아야 한다
  it('예전 주 보기 주소(?view=week)도 그 날의 월 캘린더로 연다', () => {
    renderCalendar('?view=week&date=2026-09-03');
    expect(screen.getByRole('heading', { name: '2026년 9월' })).toBeDefined();
    expect(cellOf(/^9월 3일/).tabIndex).toBe(0);
    expect(
      screen.queryByRole('button', { name: /주 보기|월 보기/ }),
    ).toBeNull();
  });

  // 성능 측정 스크립트(scripts/calendar-perf.mts)가 이 표시로 "기록이 다 그려진 때"를 안다
  it('기록을 불러오는 동안 캘린더에 aria-busy, 처음 가는 달로 넘기면 다시 켜진다', async () => {
    renderCalendar();
    const grid = screen.getByRole('grid');
    expect(grid.getAttribute('aria-busy')).toBe('true');
    await screen.findByText('가계부 1건');
    expect(grid.getAttribute('aria-busy')).toBe('false');

    let resolveNextMonth: (entries: RecordEntry[]) => void = () => {};
    vi.mocked(listRecords).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveNextMonth = resolve;
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '2026년 11월로' }));
    expect(screen.getByRole('grid').getAttribute('aria-busy')).toBe('true');

    resolveNextMonth([]);
    await vi.waitFor(() =>
      expect(screen.getByRole('grid').getAttribute('aria-busy')).toBe('false'),
    );
  });
});
