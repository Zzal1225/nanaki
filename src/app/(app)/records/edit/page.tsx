import type { Metadata } from 'next';
import { Suspense } from 'react';
import RecordEditFromUrl from '@/features/records/routes/RecordEditFromUrl';

export const metadata: Metadata = {
  title: '기록 수정',
};

// 기록 수정 /records/edit?id=… (예전 /records/<id>/edit). 상세와 같은 이유로 id를 브라우저가 읽는다:
// 연 적 없는 기록도 오프라인에서 고칠 수 있게
export default function RecordEditPage() {
  return (
    <Suspense fallback={<p className='sr-only'>수정 화면을 여는 중</p>}>
      <RecordEditFromUrl />
    </Suspense>
  );
}
