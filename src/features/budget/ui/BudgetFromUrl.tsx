'use client';

// 'use client' 이유: 달(?month=)을 서버가 아니라 브라우저가 주소에서 읽는다 (서버 HTML을 달마다 같게 → 오프라인에서 한 장으로 연다, 25c-2)
import { useSearchParams } from 'next/navigation';
import { parseMonthParam } from '@/shared/date/month';
import BudgetScreen from './BudgetScreen';

// 틀린 달(?month=2026-13)은 이번 달로 본다: 다른 화면으로 옮길 만큼 잘못된 주소가 아니다
export default function BudgetFromUrl() {
  const month = parseMonthParam(useSearchParams().get('month'));
  return <BudgetScreen month={month} />;
}
