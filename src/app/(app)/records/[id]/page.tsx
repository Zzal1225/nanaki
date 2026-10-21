import type { Metadata } from 'next';
import { Suspense } from 'react';
import RecordDetail from '@/features/records/detail/RecordDetail';

export const metadata: Metadata = {
  title: '기록 보기',
};

// cacheComponents에서 요청 때만 알 수 있는 값(params의 id)은 Suspense 안에서 읽어야 빌드된다 (작성 화면과 같은 이유)
export default function RecordDetailPage({
  params,
}: PageProps<'/records/[id]'>) {
  return (
    <Suspense fallback={<p className='sr-only'>기록을 여는 중</p>}>
      <RecordDetailContent params={params} />
    </Suspense>
  );
}

async function RecordDetailContent({
  params,
}: Pick<PageProps<'/records/[id]'>, 'params'>) {
  const { id } = await params;
  return <RecordDetail id={id} />;
}
