import type { Metadata } from 'next';
import { Suspense } from 'react';
import RoutineEditForm from '@/features/routines/form/RoutineEditForm';

export const metadata: Metadata = {
  title: '루틴 수정',
};

// params의 id는 요청 때만 알 수 있어서 Suspense 안에서 읽는다 (cacheComponents, 기록 수정 화면과 같은 구조)
export default function RoutineEditPage({
  params,
}: PageProps<'/routines/[id]/edit'>) {
  return (
    <Suspense fallback={<p className='sr-only'>수정 화면을 여는 중</p>}>
      <RoutineEditContent params={params} />
    </Suspense>
  );
}

async function RoutineEditContent({
  params,
}: Pick<PageProps<'/routines/[id]/edit'>, 'params'>) {
  const { id } = await params;
  return <RoutineEditForm id={id} doneHref='/records/type/routine' />;
}
