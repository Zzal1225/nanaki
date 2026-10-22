import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';
import { searchRecords, type SearchRecordsInput } from '../api/recordStore';
import { recordKeys } from './recordKeys';

// 검색 결과. 조건이 없으면(null: 아무것도 치지 않고 고르지 않음) 조회하지 않는다.
// keepPreviousData: 검색어를 바꾸는 동안 이전 결과를 남겨 둔다. 없으면 바꿀 때마다 목록이 비었다가 다시 채워져 깜박인다
export function useSearchRecords(input: SearchRecordsInput | null) {
  return useQuery({
    queryKey: recordKeys.search(input?.keyword ?? '', input?.sort ?? ''),
    queryFn: input ? () => searchRecords(input) : skipToken,
    placeholderData: keepPreviousData,
  });
}
