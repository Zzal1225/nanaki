import type { Metadata } from 'next';
import { Suspense } from 'react';
import BodyCompareFromUrl from '@/features/photos/compare/BodyCompareFromUrl';

export const metadata: Metadata = {
  title: '눈바디 비교',
};

// /body-compare?kind=front&from=YYYY-MM-DD&to=YYYY-MM-DD (step4 37d). 기록 layout 밖이라 PC에서도 목록 옆 패널이 아니라 넓은 한 화면이다 (시안 P6d).
// useSearchParams는 요청 때만 아는 값이라 Suspense 안에서 읽는다 (cacheComponents: 화면은 정적 한 장으로 남는다)
export default function BodyComparePage() {
  return (
    <Suspense fallback={<p className='sr-only'>눈바디 비교를 여는 중</p>}>
      <BodyCompareFromUrl />
    </Suspense>
  );
}
