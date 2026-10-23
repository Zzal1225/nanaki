import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createFixedExpense,
  deleteFixedExpense,
  listFixedExpenses,
  updateFixedExpense,
} from '../api/fixedExpenseStore';
import type { FixedExpenseInput } from '../schema/fixedExpense';

// 고정지출 데이터 훅. 화면은 이 훅만 부른다 (루틴·예산과 같은 규칙).
// 바꾸기는 온라인 전용이라 낙관적 업데이트를 하지 않는다: 실패하면 시트에 입력값이 남아 다시 누른다 (예산과 같은 판단)
export const fixedExpenseKeys = {
  all: ['fixedExpenses'] as const,
};

export function useFixedExpenses() {
  return useQuery({
    queryKey: fixedExpenseKeys.all,
    queryFn: listFixedExpenses,
  });
}

function useInvalidateFixedExpenses() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: fixedExpenseKeys.all });
}

// 가계부 쓰기에서 "고정지출"을 체크하고 저장한 뒤 부른다 (기록은 폼이 이미 만들었다)
export function useCreateFixedExpense() {
  const invalidate = useInvalidateFixedExpenses();
  return useMutation({
    mutationFn: ({
      input,
      today,
      recordedOn,
    }: {
      input: FixedExpenseInput;
      today: string;
      recordedOn: string | null;
    }) => createFixedExpense(input, { today, recordedOn }),
    onSuccess: invalidate,
  });
}

export function useUpdateFixedExpense() {
  const invalidate = useInvalidateFixedExpenses();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FixedExpenseInput }) =>
      updateFixedExpense(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteFixedExpense() {
  const invalidate = useInvalidateFixedExpenses();
  return useMutation({
    // 감싸서 id만 넘긴다: TanStack은 mutationFn에 두 번째 인자(컨텍스트)도 넘겨, 그대로 두면 저장소 함수가 모르는 값을 받는다
    mutationFn: (id: string) => deleteFixedExpense(id),
    onSuccess: invalidate,
  });
}
