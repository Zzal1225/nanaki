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
    renderCalendar('?date=2026-02-30&view=abc');
    expect(cellOf(/^10월 21일/).getAttribute('aria-current')).toBe('date');
    expect(cellOf(/^10월 21일/).tabIndex).toBe(0);
  });
});

describe('HomeCalendar 주 보기', () => {
  beforeEach(() => {
    vi.mocked(listRecords).mockReset();
    vi.mocked(listRecords).mockResolvedValue([LUNCH, CAFE]);
  });
  afterEach(() => cleanup());

  it('주로 바꾸면 고른 날은 그대로, 그 주 7칸과 그 주 기록만', async () => {
    renderCalendar('?date=2026-10-21');

    fireEvent.click(screen.getByRole('button', { name: '주 보기' }));

    expect(window.location.search).toBe('?view=week&date=2026-10-21');
    expect(screen.getByRole('heading', { name: '10월 18–24일' })).toBeDefined();
    expect(
      within(screen.getByRole('grid')).getAllByRole('gridcell'),
    ).toHaveLength(7);
    expect(listRecords).toHaveBeenLastCalledWith('2026-10-18', '2026-10-24');
    // 하루 요약은 보기와 상관없이 고른 날 그대로
    expect(await screen.findByText('가계부 1건')).toBeDefined();
  });

  it('달이 걸친 주: 다른 달 날짜도 흐리지 않고, 그 주 7일을 불러온다', () => {
    renderCalendar('?view=week&date=2026-10-01');

    expect(
      screen.getByRole('heading', { name: '9월 27일–10월 3일' }),
    ).toBeDefined();
    expect(listRecords).toHaveBeenCalledWith('2026-09-27', '2026-10-03');
  });

  it('‹ ›·PageDown은 한 주씩, 아래 방향키로 다음 주로 넘어가도 포커스가 따라간다', () => {
    renderCalendar('?view=week&date=2026-10-21');

    fireEvent.click(screen.getByRole('button', { name: '10월 25–31일로' }));
    expect(window.location.search).toBe('?view=week&date=2026-10-28');

    const cell = cellOf(/^10월 28일/);
    cell.focus();
    fireEvent.keyDown(cell, { key: 'ArrowDown' });
    expect(screen.getByRole('heading', { name: '11월 1–7일' })).toBeDefined();
    expect(document.activeElement).toBe(cellOf(/^11월 4일/));
  });

  it('월로 돌아가면 view가 주소에서 빠지고 고른 날의 달이 열린다', () => {
    renderCalendar('?view=week&date=2026-11-04');

    fireEvent.click(screen.getByRole('button', { name: '월 보기' }));

    expect(window.location.search).toBe('?date=2026-11-04');
    expect(screen.getByRole('heading', { name: '2026년 11월' })).toBeDefined();
  });
});
