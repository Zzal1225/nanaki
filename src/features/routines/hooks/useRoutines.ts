import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRoutine,
  endRoutine,
  getRoutine,
  listRoutines,
  updateRoutine,
} from '../api/routineStore';
import type { RoutineFormValues } from '../schema/routine';
import { routineKeys } from './routineKeys';

// 루틴 데이터 훅. 화면은 이 훅만 부르고 로딩·오류·캐시는 TanStack Query에 맡긴다 (records/hooks와 같은 규칙)

// 그만둔 루틴까지 모두 (지난 날의 체크 목록·달성률 계산에 필요)
export function useRoutines() {
  return useQuery({ queryKey: routineKeys.list(), queryFn: listRoutines });
}

// 없으면 data가 null
export function useRoutine(id: string) {
  return useQuery({
    queryKey: routineKeys.detail(id),
    queryFn: () => getRoutine(id),
  });
}

// 바꾼 루틴은 목록·상세 어디에나 보일 수 있어서 'routines' 캐시를 모두 무효화한다.
// return으로 다시 불러오기를 기다리게 해, 저장 뒤 이동한 화면에 이미 새 값이 보이게 한다
function useInvalidateRoutines() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: routineKeys.all });
}

export function useCreateRoutine() {
  const invalidate = useInvalidateRoutines();
  return useMutation({ mutationFn: createRoutine, onSuccess: invalidate });
}

export function useUpdateRoutine() {
  const invalidate = useInvalidateRoutines();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: RoutineFormValues }) =>
      updateRoutine(id, values),
    onSuccess: invalidate,
  });
}

export function useEndRoutine() {
  const invalidate = useInvalidateRoutines();
  return useMutation({
    mutationFn: ({ id, endedOn }: { id: string; endedOn: string }) =>
      endRoutine(id, endedOn),
    onSuccess: invalidate,
  });
}
