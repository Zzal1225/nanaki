import type { Metadata } from 'next';
import { Suspense } from 'react';
import BudgetFromUrl from '@/features/budget/ui/BudgetFromUrl';

export const metadata: Metadata = {
  title: '예산 · 고정지출',
};

// /budget?month=YYYY-MM (2026-10-23 사용자 결정). 기록 layout 밖이라 PC에서도 목록 옆 패널이 아니라 넓은 한 화면이다.
// useSearchParams는 요청 때만 아는 값이라 Suspense 안에서 읽는다 (cacheComponents: 화면은 정적 한 장으로 남는다)
export default function BudgetPage() {
  return (
    <Suspense fallback={<p className='sr-only'>예산을 여는 중</p>}>
      <BudgetFromUrl />
    </Suspense>
  );
}
