import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import TypeDetail from '@/features/records/type/TypeDetail';
import { parseRecordType } from '@/features/records/schema/recordTypes';
import { parseMonthParam } from '@/shared/date/month';

export const metadata: Metadata = {
  title: '타입별 기록',
};

// params(타입)·searchParams(달)는 요청 때만 알 수 있어서 Suspense 안에서 읽는다 (cacheComponents)
export default function TypeDetailPage({
  params,
  searchParams,
}: PageProps<'/records/type/[type]'>) {
  return (
    <Suspense fallback={<p className='sr-only'>타입별 기록을 여는 중</p>}>
      <TypeDetailContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

// 주소는 누구나 고쳐 칠 수 있다: 모르는 타입이면 기록 탭으로, 틀린 달이면 이번 달로
async function TypeDetailContent({
  params,
  searchParams,
}: Pick<PageProps<'/records/type/[type]'>, 'params' | 'searchParams'>) {
  const [{ type }, { month }] = await Promise.all([params, searchParams]);
  const recordType = parseRecordType(type);
  if (!recordType) redirect('/records');

  return <TypeDetail type={recordType} month={parseMonthParam(month)} />;
}
