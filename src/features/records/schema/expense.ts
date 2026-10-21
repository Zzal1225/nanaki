import { z } from 'zod';

// 0을 하나 더 누르는 오타를 막기 위한 한 건 상한
export const MAX_EXPENSE_AMOUNT = 99_999_999;
export const MAX_EXPENSE_LABEL_LENGTH = 12;

// 직접 입력을 허용하므로 검증에는 쓰지 않고, 폼에서 기본 선택지로만 보여 준다
export const EXPENSE_CATEGORIES = [
  '식비',
  '카페',
  '교통',
  '생활',
  '쇼핑',
  '기타',
] as const;
export const PAYMENT_METHODS = ['카드', '현금', '계좌이체'] as const;

// z.strictObject가 아니라 z.object: 모르는 키는 실패시키지 않고 지운다.
// 나중에 필드를 없애도 예전 기록을 읽을 때 검증이 깨지지 않고, 저장할 때는 지워진 값만 DB로 간다
export const expenseFieldsSchema = z.object({
  // 지출만 기록하므로 양수로 저장하고 마이너스는 화면에서만 붙인다 (예산 합계에서 부호를 신경 쓰지 않게)
  amount: z.number().int().positive().max(MAX_EXPENSE_AMOUNT),
  // trim이 min(1)보다 앞이어야 공백만 입력한 값이 막힌다
  category: z.string().trim().min(1).max(MAX_EXPENSE_LABEL_LENGTH),
  paymentMethod: z
    .string()
    .trim()
    .min(1)
    .max(MAX_EXPENSE_LABEL_LENGTH)
    .optional(),
});

export type ExpenseFields = z.infer<typeof expenseFieldsSchema>;
