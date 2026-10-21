import { useQuery } from '@tanstack/react-query';
import { listRecords } from '../api/recordStore';
import { recordKeys } from './recordKeys';

// 기간 안의 기록 목록. 화면은 이 훅만 부르고 로딩·오류·캐시는 TanStack Query에 맡긴다
export function useRecords(from: string, to: string) {
  return useQuery({
    queryKey: recordKeys.list(from, to),
    queryFn: () => listRecords(from, to),
  });
}
