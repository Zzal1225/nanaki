import { skipToken, useQuery } from '@tanstack/react-query';
import type { DateRange } from '@/shared/date/monthRange';
import { listRecords } from '../api/recordStore';
import { recordKeys } from './recordKeys';

// 기간 안의 기록 목록. 화면은 이 훅만 부르고 로딩·오류·캐시는 TanStack Query에 맡긴다.
// 기간을 아직 모르면(null, 예: 브라우저에서 오늘 날짜를 읽기 전) skipToken으로 조회를 보내지 않는다.
// enabled: false 대신 skipToken: queryFn 안에서 range가 null이 아님을 타입이 보장해서 range! 같은 단언이 필요 없다
export function useRecords(range: DateRange | null) {
  return useQuery({
    queryKey: recordKeys.list(range?.from ?? '', range?.to ?? ''),
    queryFn: range ? () => listRecords(range.from, range.to) : skipToken,
  });
}
