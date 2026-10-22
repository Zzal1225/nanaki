import type { Metadata } from 'next';
import SearchView from '@/features/search/SearchView';

export const metadata: Metadata = {
  title: '기록 검색',
};

// 모바일·태블릿: 검색 화면 전체. PC: 검색은 layout의 왼쪽 목록 자리(RecordsSidePanel)에 열리므로 오른쪽은 안내만.
// 기록 탭 첫 화면(records/page.tsx)과 같은 방식이다 (PC에서도 아래 검색이 함께 그려지지만 display:none, 같은 쿼리 키라 조회는 한 번)
export default function RecordSearchPage() {
  return (
    <>
      <div className='lg:hidden'>
        <SearchView />
      </div>
      <p className='hidden h-full items-center justify-center text-body text-fg-secondary lg:flex'>
        기록을 고르면 여기에 보여요
      </p>
    </>
  );
}
