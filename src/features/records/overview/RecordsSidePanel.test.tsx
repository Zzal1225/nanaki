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
vi.mock('../type/TypeDetail', () => ({
  default: ({ type, month }: { type: string; month: string | null }) => (
    <p>{`타입 상세 ${type} ${month ?? '이번 달'}`}</p>
  ),
}));
// 타입 화면에서 연 기록은 기록의 타입을 사본에서 읽는다 (주소에 타입이 없다)
const record = vi.hoisted(() => ({
  state: { isPending: false, data: null as { type: string } | null },
}));
vi.mock('../hooks/useRecord', () => ({ useRecord: () => record.state }));

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

  // Issue #30: 타입 화면과 거기서 연 기록은 왼쪽에 그 타입 상세 (같은 달)
  it('타입 화면이면 그 타입 상세, 틀린 달은 이번 달', () => {
    renderAt('/records/type/expense', 'month=2026-09');
    expect(screen.getByText('타입 상세 expense 2026-09')).toBeDefined();
    cleanup();
    renderAt('/records/type/review', 'month=2026-13');
    expect(screen.getByText('타입 상세 review 이번 달')).toBeDefined();
  });
  it('타입 화면에서 연 기록(back=type)은 기록의 타입으로 그 달 타입 상세', () => {
    record.state = { isPending: false, data: { type: 'workout' } };
    renderAt('/records/view', 'id=abc&back=type&month=2026-09');
    expect(screen.getByText('타입 상세 workout 2026-09')).toBeDefined();
    cleanup();
    // 수정 화면도 들어온 곳을 그대로 들고 간다
    renderAt('/records/edit', 'id=abc&back=type&month=2026-09');
    expect(screen.getByText('타입 상세 workout 2026-09')).toBeDefined();
  });
  it('그 기록이 없으면(지워짐) 기록 탭 첫 화면, 읽는 중에는 빈 자리', () => {
    record.state = { isPending: false, data: null };
    renderAt('/records/view', 'id=gone&back=type');
    expect(screen.getByText('기록 탭 첫 화면')).toBeDefined();
    cleanup();
    record.state = { isPending: true, data: null };
    renderAt('/records/view', 'id=abc&back=type');
    expect(screen.queryByText(/타입 상세|기록 탭 첫 화면/)).toBeNull();
  });
});
