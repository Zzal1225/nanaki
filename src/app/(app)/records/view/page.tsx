import type { Metadata } from 'next';
import { Suspense } from 'react';
import RecordDetailFromUrl from '@/features/records/routes/RecordDetailFromUrl';

export const metadata: Metadata = {
  title: '기록 보기',
};

// 기록 상세 /records/view?id=… (예전 /records/<id>, 2026-10-22 사용자 결정).
// 기록 id는 브라우저가 주소에서 읽는다: 화면 HTML이 기록과 상관없이 한 장(정적)이라,
// 서비스 워커가 저장해 둔 그 한 장으로 연 적 없는 기록도 오프라인에서 연다 (features/records/routes)
// Suspense: ?id=는 미리 그릴 때 알 수 없어서(cacheComponents) 그 자리만 비워 두고 브라우저가 채운다
export default function RecordViewPage() {
  return (
    <Suspense fallback={<p className='sr-only'>기록을 여는 중</p>}>
      <RecordDetailFromUrl />
    </Suspense>
  );
}
