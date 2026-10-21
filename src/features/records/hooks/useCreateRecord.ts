import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createRecord } from '../api/recordStore';
import { recordKeys } from './recordKeys';

// 기록 만들기. 저장에 성공하면 기록 캐시를 모두 무효화해서 목록·캘린더가 새로 불러오게 한다.
// 새 기록이 어느 기간 목록에 들어갈지 따지지 않아도 돼서 단순하다 (캐시에 직접 끼워 넣는 낙관적 업데이트는 step2)
export function useCreateRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRecord,
    // return하면 목록을 다시 불러올 때까지 mutation이 "진행 중"으로 남는다.
    // 그래서 저장 버튼 로딩이 목록 갱신까지 끝난 뒤 꺼지고, 돌아간 목록에 새 기록이 이미 있다
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: recordKeys.all }),
  });
}
