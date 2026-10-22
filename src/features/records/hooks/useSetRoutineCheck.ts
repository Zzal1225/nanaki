import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setRoutineCheck } from '../api/recordStore';
import { recordKeys } from './recordKeys';

// 루틴 체크 저장. 체크는 캘린더 점·하루 요약·기록 탭 카드(달성률)·목록 어디에나 보여서 'records' 캐시를 모두 무효화한다.
// return으로 다시 불러오기를 기다리게 해, 버튼이 "저장 중"인 동안 화면이 이전 값으로 돌아가 보이지 않게 한다
export function useSetRoutineCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setRoutineCheck,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: recordKeys.all }),
  });
}
