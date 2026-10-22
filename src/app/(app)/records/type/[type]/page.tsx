import type { Metadata } from 'next';
import { Suspense } from 'react';
import TypeDetailFromUrl from '@/features/records/routes/TypeDetailFromUrl';

export const metadata: Metadata = {
  title: '타입별 기록',
};

// 타입·달(?month=)은 브라우저가 주소에서 읽는다 (25c-2): 서버 HTML이 달마다 같아야
// 서비스 워커가 저장해 둔 타입 화면 한 장으로 다른 달도 오프라인에서 연다
export default function TypeDetailPage() {
  return (
    <Suspense fallback={<p className='sr-only'>타입별 기록을 여는 중</p>}>
      <TypeDetailFromUrl />
    </Suspense>
  );
}
