import type { Metadata } from 'next';
import { Suspense } from 'react';
import NewRecordFromUrl from '@/features/records/routes/NewRecordFromUrl';

export const metadata: Metadata = {
  title: '새 기록',
};

// 타입(?type=)·날짜(?date=)는 브라우저가 주소에서 읽는다 (25c-2). 서버가 읽던 때는 타입마다 HTML이 달라
// 서비스 워커가 저장해 둔 한 장으로 다른 타입을 쓸 수 없었다 → 이제 미리 그린 한 장(○)이 모든 타입에 쓰인다
export default function NewRecordPage() {
  return (
    <Suspense fallback={<p className='sr-only'>작성 화면을 여는 중</p>}>
      <NewRecordFromUrl />
    </Suspense>
  );
}
