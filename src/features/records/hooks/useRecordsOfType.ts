import { skipToken, useQuery } from '@tanstack/react-query';
import type { DateRange } from '@/shared/date/monthRange';
import { listRecordsOfType } from '../api/recordStore';
import type { RecordType } from '../schema/recordTypes';
import { recordKeys } from './recordKeys';

// 한 타입의 기간 안 기록. 기간을 아직 모르면(브라우저에서 오늘을 읽기 전) skipToken으로 미룬다
export function useRecordsOfType(type: RecordType, range: DateRange | null) {
  return useQuery({
    queryKey: recordKeys.ofType(type, range?.from ?? '', range?.to ?? ''),
    queryFn: range
      ? () => listRecordsOfType(type, range.from, range.to)
      : skipToken,
  });
}
