import { useQuery } from '@tanstack/react-query';
import { listRecentRecords } from '../api/recordStore';
import { recordKeys } from './recordKeys';

// 날짜와 상관없는 최근 기록. 키가 'records'로 시작해서 저장 후 무효화에 함께 새로 불러온다
export function useRecentRecords(limit: number) {
  return useQuery({
    queryKey: recordKeys.recent(limit),
    queryFn: () => listRecentRecords(limit),
  });
}
