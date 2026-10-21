import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateRecord } from '../api/recordStore';
import { recordKeys } from './recordKeys';

// 기록 고치기. 고친 기록은 목록·카드·상세 어디에나 보일 수 있어서 'records' 캐시를 모두 무효화한다
export function useUpdateRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateRecord,
    // return: 다시 불러오기가 끝날 때까지 저장 중으로 남겨, 상세로 돌아갔을 때 고친 값이 이미 보이게 한다
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: recordKeys.all }),
  });
}
