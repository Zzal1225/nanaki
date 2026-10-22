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
import { searchRecords } from '@/features/records/api/recordStore';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import { getUserSettings } from '@/features/settings/api/settingsStore';
import SearchView from './SearchView';

// 주소는 테스트마다 정한다. replace는 "어느 주소로 바꾸려 했는지"만 본다 (주소 → 화면은 searchState 테스트가 맡는다)
const navigation = vi.hoisted(() => ({
  search: '',
  replace: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigation.replace }),
  usePathname: () => '/records/search',
  useSearchParams: () => new URLSearchParams(navigation.search),
}));
// 검색만 가짜로 바꾸고 상수(SEARCH_RESULT_LIMIT)는 진짜를 쓴다
vi.mock('@/features/records/api/recordStore', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  searchRecords: vi.fn(),
}));
vi.mock('@/features/settings/api/settingsStore', () => ({
  getUserSettings: vi.fn(),
  updateHiddenTypes: vi.fn(),
}));

const BASE = { occurredAt: '2026-10-16', memo: null, tags: [] };
const COFFEE: RecordEntry = {
  ...BASE,
  id: 'coffee',
  type: 'expense',
  title: '커피',
  fields: { amount: 4500, category: '카페' },
};
const CAFE_REVIEW: RecordEntry = {
  ...BASE,
  id: 'review',
  type: 'review',
  title: '동네 카페',
  fields: { rating: 4, targetKind: '장소' },
};

function renderSearch(search: string) {
  navigation.search = search;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <SearchView />
    </QueryClientProvider>,
  );
}

describe('SearchView', () => {
  beforeEach(() => {
    navigation.replace.mockReset();
    vi.mocked(searchRecords).mockReset();
    vi.mocked(searchRecords).mockResolvedValue({
      entries: [COFFEE, CAFE_REVIEW],
      isTruncated: false,
    });
    vi.mocked(getUserSettings).mockResolvedValue({ hiddenTypes: [] });
  });
  afterEach(() => cleanup());

  it('검색어도 타입도 없으면 안내만 보이고 조회하지 않는다', async () => {
    renderSearch('');
    expect(
      await screen.findByText('제목·메모·분류로 기록을 찾을 수 있어요'),
    ).toBeDefined();
    expect(searchRecords).not.toHaveBeenCalled();
  });

  it('주소의 검색어로 찾고, 개수·타입 칩 건수·검색어 강조를 보여 준다', async () => {
    renderSearch('q=카페');

    expect(await screen.findByRole('status')).toHaveProperty(
      'textContent',
      '2개',
    );
    expect(searchRecords).toHaveBeenCalledWith({
      keyword: '카페',
      sort: 'latest',
    });
    const chips = screen.getByRole('group', { name: '타입' });
    expect(
      within(chips).getByRole('button', { name: /가계부\s*1/ }),
    ).toBeDefined();
    // 결과가 없는 타입은 눌러도 빈 목록이라 막는다
    expect(
      within(chips).getByRole('button', { name: /운동\s*0/ }),
    ).toHaveProperty('disabled', true);
    // 목록 제목 "[카페] 커피"(분류)와 "[장소] 동네 카페"(제목)의 "카페"가 강조된다
    expect(screen.getAllByText('카페', { selector: 'mark' })).toHaveLength(2);
    // 검색 조건을 달고 상세로 간다 (PC는 왼쪽 결과가 남고, 모바일 뒤로 버튼은 결과로 돌아온다)
    expect(
      screen.getByRole('link', { name: /동네 카페/ }).getAttribute('href'),
    ).toBe('/records/review?q=%EC%B9%B4%ED%8E%98');
  });

  it('타입 칩은 받은 결과를 거르고, 주소에 타입을 남긴다', async () => {
    renderSearch('q=카페&type=review');

    expect(await screen.findByRole('status')).toHaveProperty(
      'textContent',
      '1개',
    );
    expect(screen.queryByRole('link', { name: /커피/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^전체/ }));
    expect(navigation.replace).toHaveBeenCalledWith(
      '/records/search?q=%EC%B9%B4%ED%8E%98',
      { scroll: false },
    );
  });

  it('검색창에서 제출하면 앞뒤 공백을 뺀 검색어로 주소를 바꾼다', async () => {
    renderSearch('');
    const input = screen.getByRole('searchbox', { name: '검색어' });

    fireEvent.change(input, { target: { value: '  라떼 ' } });
    fireEvent.submit(screen.getByRole('search'));

    expect(navigation.replace).toHaveBeenCalledWith(
      '/records/search?q=%EB%9D%BC%EB%96%BC',
      { scroll: false },
    );
  });

  it('맞는 기록이 없으면 검색어를 넣어 알려 준다', async () => {
    vi.mocked(searchRecords).mockResolvedValue({
      entries: [],
      isTruncated: false,
    });
    renderSearch('q=없는말');
    expect(
      await screen.findByText("'없는말'에 맞는 기록이 없어요"),
    ).toBeDefined();
  });

  it('한도를 넘으면 일부만 보인다고 알린다', async () => {
    vi.mocked(searchRecords).mockResolvedValue({
      entries: [COFFEE],
      isTruncated: true,
    });
    renderSearch('q=커피');
    expect(await screen.findByText(/최근 300개까지만 보여요/)).toBeDefined();
  });
});
