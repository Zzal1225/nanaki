'use client';

// 'use client' 이유: 지금 주소(경로·검색 조건)를 보고 왼쪽 목록에 무엇을 보여 줄지 정한다
import { RECORD_VIEW_PATH } from '../routes/recordRoutes';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import SearchView from '@/features/search/SearchView';
import {
  hasSearchCondition,
  parseSearchState,
} from '@/features/search/searchState';
import RecordsOverview from './RecordsOverview';

// PC 기록 탭 왼쪽 목록 자리 (layout). 평소에는 기록 탭 첫 화면, 검색 중에는 검색 결과 (시안 P2: 결과 옆에 상세).
// 검색 결과에서 연 상세(/records/view?id=…&q=카페)도 검색 중으로 본다: 결과를 눌러도 왼쪽 목록이 기록 탭으로 바뀌지 않게.
// 상세만 보는 이유: /records/new?type=expense처럼 다른 화면도 type을 주소에 쓴다
export default function RecordsSidePanel() {
  return (
    // 미리 그릴 때는 주소를 몰라 기다린다. 가장 흔한 기록 탭 첫 화면으로 먼저 그려 둔다
    <Suspense fallback={<RecordsOverview />}>
      <RecordsSidePanelContent />
    </Suspense>
  );
}

function RecordsSidePanelContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSearching =
    pathname === '/records/search' ||
    (pathname === RECORD_VIEW_PATH &&
      hasSearchCondition(parseSearchState(searchParams)));

  return isSearching ? <SearchView /> : <RecordsOverview />;
}
