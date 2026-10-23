import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { getBudget, saveBudget, type BudgetView } from '../api/budgetStore';

// 예산 캐시의 이름표. 기록(['records'])과 따로 둔다: 기록을 무효화할 때 예산까지 다시 부르지 않게
export const budgetKeys = {
  all: ['budget'] as const,
  month: (month: string) => [...budgetKeys.all, month] as const,
};

// 그 달 예산 (없으면 이어받은 예산). 달을 아직 모르면(브라우저에서 오늘을 읽기 전) skipToken으로 미룬다
export function useBudget(month: string | null) {
  return useQuery({
    queryKey: budgetKeys.month(month ?? ''),
    queryFn: month ? () => getBudget(month) : skipToken,
  });
}

// 저장은 온라인 전용이라 낙관적 업데이트를 하지 않는다 (설정 스위치와 다름): 실패하면 시트에 남아 다시 누르게 한다.
// 성공하면 그 달 캐시는 받은 값으로 바로 바꾸고, 다른 달은 무효화한다:
// 이 달 줄이 새로 생기면 뒤 달들이 이어받는 값도 바뀐다 (11월이 10월을 이어받고 있었다면)
export function useSaveBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveBudget,
    onSuccess: (view: BudgetView) => {
      queryClient.setQueryData(budgetKeys.month(view.budget.month), view);
      return queryClient.invalidateQueries({
        queryKey: budgetKeys.all,
        // 방금 넣은 이 달 값은 다시 부르지 않는다
        predicate: (query) => query.queryKey[1] !== view.budget.month,
      });
    },
  });
}
