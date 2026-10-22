'use client';

// 'use client' 이유: 기록 id와 검색 조건을 주소에서 브라우저가 읽는다 (서버 HTML을 기록마다 같게, recordRoutes 설명)
import { usePathname, useSearchParams } from 'next/navigation';
import {
  hasSearchCondition,
  parseSearchState,
  toSearchHref,
} from '@/features/search/searchState';
import RecordDetail from '../detail/RecordDetail';
import { recordIdFromPath } from './recordRoutes';

// /records/<id> (?q=… 검색 결과에서 온 경우 뒤로 버튼이 그 결과로)
export default function RecordDetailFromUrl() {
  const id = recordIdFromPath(usePathname());
  const search = parseSearchState(useSearchParams());
  const backHref = hasSearchCondition(search)
    ? toSearchHref(search)
    : '/records';
  if (!id) return null;
  // key: 같은 틀에서 다른 기록으로 옮겨 가면 화면 상태를 새로 시작한다
  return <RecordDetail key={id} id={id} backHref={backHref} />;
}
