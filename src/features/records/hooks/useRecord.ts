import { useQuery } from '@tanstack/react-query';
import { getRecord } from '../api/recordStore';
import { recordKeys } from './recordKeys';

// 기록 하나. 없거나 지운 기록이면 data가 null (getRecord가 maybeSingle로 돌려준다)
export function useRecord(id: string) {
  return useQuery({
    queryKey: recordKeys.detail(id),
    queryFn: () => getRecord(id),
  });
}
