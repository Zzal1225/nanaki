'use client';

// 'use client' 이유: 지금 주소(경로·검색 조건·들어온 곳)를 보고 왼쪽 목록에 무엇을 보여 줄지 정한다
import {
  openRecordId,
  RECORD_EDIT_PATH,
  RECORD_VIEW_PATH,
  recordTypeFromPath,
} from '../routes/recordRoutes';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { parseMonthParam } from '@/shared/date/month';
import SearchView from '@/features/search/SearchView';
import {
  hasSearchCondition,
  parseSearchState,
} from '@/features/search/searchState';
import { useRecord } from '../hooks/useRecord';
import { parseDetailOrigin } from '../routes/detailOrigin';
import TypeDetail from '../type/TypeDetail';
import RecordsOverview from './RecordsOverview';

// PC 기록 탭 왼쪽 목록 자리 (layout). 평소에는 기록 탭 첫 화면, 검색 중에는 검색 결과 (시안 P2: 결과 옆에 상세),
// 타입 화면(/records/type/<type>)과 거기서 연 기록이면 그 타입 상세 (Issue #30, 시안 "타입 상세 (가계부)").
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

  const listType = recordTypeFromPath(pathname);
  if (listType) {
    return (
      <TypeDetail
        type={listType}
        // 틀린 달은 이번 달 (TypeDetailFromUrl과 같은 규칙)
        month={parseMonthParam(searchParams.get('month'))}
      />
    );
  }

  const isDetail =
    pathname === RECORD_VIEW_PATH || pathname === RECORD_EDIT_PATH;
  const origin = isDetail ? parseDetailOrigin(searchParams) : null;
  if (origin?.kind === 'type') {
    return (
      <TypeListOfRecord
        id={openRecordId(pathname, searchParams) ?? ''}
        month={origin.month}
      />
    );
  }

  const isSearching =
    pathname === '/records/search' ||
    (pathname === RECORD_VIEW_PATH &&
      hasSearchCondition(parseSearchState(searchParams)));

  return isSearching ? <SearchView /> : <RecordsOverview />;
}

// 타입 화면에서 연 기록: 주소에는 타입이 없다(back=type&month=만, detailOrigin) → 기록의 타입을 기기 사본에서 읽는다.
// 주소에 타입을 더 싣지 않은 이유: 검색 조건이 이미 type(타입 칩)을 써서 섞이면 검색 중으로 잘못 본다.
// 읽는 동안(사본이라 잠깐)은 빈 자리: 기록 탭 첫 화면을 그렸다 바꾸면 깜박인다. 지워진 기록이면 기록 탭 첫 화면
function TypeListOfRecord({ id, month }: { id: string; month: string | null }) {
  const record = useRecord(id);
  if (record.isPending) return <div aria-busy='true' className='h-40' />;
  if (!record.data) return <RecordsOverview />;
  return <TypeDetail type={record.data.type} month={month} />;
}
