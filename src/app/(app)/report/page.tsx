import type { Metadata } from 'next';
import { Suspense } from 'react';
import ReportFromUrl from '@/features/report/ui/ReportFromUrl';

export const metadata: Metadata = {
  title: '보고서',
};

// /report (고르기) · /report?from=&to=&types= (결과). 기록 layout 밖이라 PC에서도 목록 옆 패널이 아니라 넓은 한 화면이다 (예산 화면과 같다).
// useSearchParams는 요청 때만 아는 값이라 Suspense 안에서 읽는다 (cacheComponents: 화면은 정적 한 장으로 남는다)
export default function ReportPage() {
  return (
    <Suspense fallback={<p className='sr-only'>보고서를 여는 중</p>}>
      <ReportFromUrl />
    </Suspense>
  );
}
