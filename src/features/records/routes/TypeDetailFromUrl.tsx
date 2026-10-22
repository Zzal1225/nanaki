'use client';

// 'use client' 이유: 타입과 달(?month=)을 주소에서 브라우저가 읽는다 (서버 HTML을 달마다 같게, recordRoutes 설명)
import { usePathname, useSearchParams } from 'next/navigation';
import { parseMonthParam } from '@/shared/date/month';
import { useReplaceRoute } from '@/shared/navigation/useReplaceRoute';
import TypeDetail from '../type/TypeDetail';
import { recordTypeFromPath } from './recordRoutes';

// /records/type/<type>?month=YYYY-MM. 주소는 누구나 고쳐 칠 수 있다: 모르는 타입이면 기록 탭으로, 틀린 달이면 이번 달로.
// redirect()를 쓰지 않는 이유는 NewRecordFromUrl과 같다: 떠난 뒤 숨은 이 화면은 지금 주소(예: /)로 다시 그려져
// 타입을 못 찾는데, 그때 redirect()를 던지면 다음에 이 화면을 열 때 기록 탭으로 튕긴다 (useReplaceRoute 설명)
export default function TypeDetailFromUrl() {
  const type = recordTypeFromPath(usePathname());
  const month = parseMonthParam(useSearchParams().get('month'));
  useReplaceRoute(type ? null : '/records');
  if (!type) return null;
  return <TypeDetail type={type} month={month} />;
}
