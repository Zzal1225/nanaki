// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RecordsSidePanel from './RecordsSidePanel';

const location = vi.hoisted(() => ({ pathname: '/records', search: '' }));
vi.mock('next/navigation', () => ({
  usePathname: () => location.pathname,
  useSearchParams: () => new URLSearchParams(location.search),
}));
// 이 테스트는 "어느 쪽을 보여 주는지"만 본다. 두 화면의 내용은 각자의 테스트가 맡는다
vi.mock('@/features/search/SearchView', () => ({
  default: () => <p>검색 화면</p>,
}));
vi.mock('./RecordsOverview', () => ({
  default: () => <p>기록 탭 첫 화면</p>,
}));

function renderAt(pathname: string, search = '') {
  location.pathname = pathname;
  location.search = search;
  render(<RecordsSidePanel />);
}

describe('PC 왼쪽 목록', () => {
  afterEach(() => cleanup());

  it('검색 화면이면 검색', () => {
    renderAt('/records/search');
    expect(screen.getByText('검색 화면')).toBeDefined();
  });
  it('검색 결과에서 연 상세(?q=)도 검색을 남긴다', () => {
    renderAt('/records/view', 'id=abc&q=카페');
    expect(screen.getByText('검색 화면')).toBeDefined();
  });
  it('그냥 연 상세, 작성 화면의 ?type=은 기록 탭 첫 화면', () => {
    renderAt('/records/view', 'id=abc');
    expect(screen.getByText('기록 탭 첫 화면')).toBeDefined();
    cleanup();
    renderAt('/records/new', 'type=expense');
    expect(screen.getByText('기록 탭 첫 화면')).toBeDefined();
  });
});
