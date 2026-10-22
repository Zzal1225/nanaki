'use client';

// 'use client' 이유: 타입과 달(?month=)을 주소에서 브라우저가 읽는다 (서버 HTML을 달마다 같게, recordRoutes 설명)
import { redirect, usePathname, useSearchParams } from 'next/navigation';
import { parseMonthParam } from '@/shared/date/month';
import TypeDetail from '../type/TypeDetail';
import { recordTypeFromPath } from './recordRoutes';

// /records/type/<type>?month=YYYY-MM. 주소는 누구나 고쳐 칠 수 있다: 모르는 타입이면 기록 탭으로, 틀린 달이면 이번 달로
export default function TypeDetailFromUrl() {
  const type = recordTypeFromPath(usePathname());
  const month = parseMonthParam(useSearchParams().get('month'));
  if (!type) redirect('/records');
  return <TypeDetail type={type} month={month} />;
}
