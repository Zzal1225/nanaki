import type { Metadata } from 'next';
import { Suspense } from 'react';
import RecordEditForm from '@/features/records/detail/RecordEditForm';

export const metadata: Metadata = {
  title: '기록 수정',
};

// params의 id는 요청 때만 알 수 있어서 Suspense 안에서 읽는다
export default function RecordEditPage({
  params,
}: PageProps<'/records/[id]/edit'>) {
  return (
    <Suspense fallback={<p className='sr-only'>수정 화면을 여는 중</p>}>
      <RecordEditContent params={params} />
    </Suspense>
  );
}

async function RecordEditContent({
  params,
}: Pick<PageProps<'/records/[id]/edit'>, 'params'>) {
  const { id } = await params;
  return <RecordEditForm id={id} />;
}
