import type { Metadata } from 'next';
import FixedExpensesScreen from '@/features/fixedExpenses/ui/FixedExpensesScreen';

export const metadata: Metadata = {
  title: '고정지출',
};

// 주소에 값이 없는 화면이라 정적 한 장 (서비스 워커 저장본으로 오프라인에서도 열린다). 기록 layout 밖: PC에서도 넓은 한 화면
export default function FixedExpensesPage() {
  return <FixedExpensesScreen />;
}
