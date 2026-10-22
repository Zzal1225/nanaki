import type { Metadata } from 'next';
import { Suspense } from 'react';
import RecordDetailFromUrl from '@/features/records/routes/RecordDetailFromUrl';

export const metadata: Metadata = {
  title: '기록 보기',
};

// 기록 id·검색 조건은 브라우저가 주소에서 읽는다 (25c-2): 서버 HTML이 기록마다 같아야
// 서비스 워커가 저장해 둔 한 장으로 연 적 없는 기록도 오프라인에서 연다 (features/records/routes)
// Suspense: 주소를 읽는 부분은 미리 그릴 때 알 수 없어서 (cacheComponents) 그 자리만 비워 둔다
export default function RecordDetailPage() {
  return (
    <Suspense fallback={<p className='sr-only'>기록을 여는 중</p>}>
      <RecordDetailFromUrl />
    </Suspense>
  );
}
