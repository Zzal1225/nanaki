import type { Metadata } from 'next';
import { Suspense } from 'react';
import RecordDetail from '@/features/records/detail/RecordDetail';
import {
  hasSearchCondition,
  parseSearchState,
  toSearchHref,
} from '@/features/search/searchState';

export const metadata: Metadata = {
  title: '기록 보기',
};

// cacheComponents에서 요청 때만 알 수 있는 값(params의 id)은 Suspense 안에서 읽어야 빌드된다 (작성 화면과 같은 이유)
export default function RecordDetailPage({
  params,
  searchParams,
}: PageProps<'/records/[id]'>) {
  return (
    <Suspense fallback={<p className='sr-only'>기록을 여는 중</p>}>
      <RecordDetailContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function RecordDetailContent({
  params,
  searchParams,
}: Pick<PageProps<'/records/[id]'>, 'params' | 'searchParams'>) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  // 검색 결과에서 왔으면(?q=카페) 뒤로 버튼이 그 검색 결과로 돌아간다. 아니면 기록 탭으로
  // 서버의 searchParams는 { 이름: 값 | 값[] } 객체라 URLSearchParams로 바꿔 읽는다 (같은 이름 여러 개 = 배열)
  const searchQuery = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    for (const item of [value ?? []].flat()) searchQuery.append(name, item);
  }
  const search = parseSearchState(searchQuery);
  const backHref = hasSearchCondition(search)
    ? toSearchHref(search)
    : '/records';
  return <RecordDetail id={id} backHref={backHref} />;
}
