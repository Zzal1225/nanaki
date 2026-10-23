import { z } from 'zod';
import {
  MAX_EXPENSE_AMOUNT,
  MAX_EXPENSE_LABEL_LENGTH,
} from '@/features/records/schema/expense';
import { parseMonthParam } from '@/shared/date/month';
import { maxLengthMessage } from '@/features/records/schema/fieldKinds';

// 가계부 예산 한 달치 (step3, DB: budgets). 달마다 따로 둔다 (2026-10-23 사용자 결정)
export type Budget = {
  // 'YYYY-MM'
  month: string;
  // 그달 전체 예산. null = 전체 예산 없음 (분류별만 쓰는 사람)
  total: number | null;
  // 분류 이름 → 예산. 비어 있으면 분류별 예산 없음
  categories: Record<string, number>;
};

// 분류별 예산 개수 상한. 기본 분류(8개) + 직접 입력 분류 몇 개면 충분하고, 끝없이 늘어 화면이 길어지지 않게
export const MAX_BUDGET_CATEGORIES = 20;

// 금액 규칙은 지출 기록과 같다 (같은 단위·같은 상한이라 예산과 지출을 그대로 비교한다).
// DB check(1~99,999,999)와 같은 값: DB는 앱을 거치지 않는 요청까지 막는 마지막 방어선
const amountSchema = z
  .number({ error: '금액을 입력해 주세요' })
  .int({ error: '정수로 입력해 주세요' })
  .positive({ error: '0보다 큰 값을 입력해 주세요' })
  .max(MAX_EXPENSE_AMOUNT, {
    error: `${MAX_EXPENSE_AMOUNT.toLocaleString('ko-KR')}원까지 입력할 수 있어요`,
  });

// 분류 이름은 지출의 분류 칸과 같은 규칙 (직접 입력한 분류도 예산을 둘 수 있게)
const categoryNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_EXPENSE_LABEL_LENGTH, {
    error: maxLengthMessage(MAX_EXPENSE_LABEL_LENGTH),
  });

export const budgetSchema = z.object({
  month: z.string().refine((value) => parseMonthParam(value) !== null, {
    error: '달 형식이 맞지 않아요',
  }),
  total: amountSchema.nullable(),
  categories: z
    .record(categoryNameSchema, amountSchema)
    // Object.keys: record는 개수 제한 메서드가 없다
    .refine((value) => Object.keys(value).length <= MAX_BUDGET_CATEGORIES, {
      error: `분류별 예산은 ${MAX_BUDGET_CATEGORIES}개까지 둘 수 있어요`,
    }),
});

// 예산이 하나도 없는 달 (전체·분류 모두 비어 있음)
export function emptyBudget(month: string): Budget {
  return { month, total: null, categories: {} };
}

export function hasAnyBudget(budget: Budget): boolean {
  return budget.total !== null || Object.keys(budget.categories).length > 0;
}
