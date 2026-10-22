import type { Metadata } from 'next';
import { Suspense } from 'react';
import RecordEditFromUrl from '@/features/records/routes/RecordEditFromUrl';

export const metadata: Metadata = {
  title: '기록 수정',
};

// 기록 id는 브라우저가 주소에서 읽는다 (상세 화면과 같은 이유: 오프라인에서 연 적 없는 기록도 고칠 수 있게)
export default function RecordEditPage() {
  return (
    <Suspense fallback={<p className='sr-only'>수정 화면을 여는 중</p>}>
      <RecordEditFromUrl />
    </Suspense>
  );
}
