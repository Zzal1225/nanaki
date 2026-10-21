import { z } from 'zod';
import {
  numberField,
  customSelectField,
  optional,
  toFieldsSchema,
  type FieldDef,
} from './fieldKinds';

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
  '의료',
  '기타',
] as const;
export const PAYMENT_METHODS = ['카드', '현금', '계좌이체'] as const;

// 배열 순서 = 폼의 입력칸 순서
// 금액은 지출만 기록하므로 양수로 저장하고 마이너스는 화면에서만 붙인다 (예산 합계에서 부호를 신경 쓰지 않게)
export const EXPENSE_FIELDS = [
  numberField({
    name: 'amount',
    label: '금액',
    unit: '원',
    max: MAX_EXPENSE_AMOUNT,
  }),
  customSelectField({
    name: 'category',
    label: '분류',
    options: EXPENSE_CATEGORIES,
    maxLength: MAX_EXPENSE_LABEL_LENGTH,
  }),
  optional(
    customSelectField({
      name: 'paymentMethod',
      label: '결제수단',
      options: PAYMENT_METHODS,
      maxLength: MAX_EXPENSE_LABEL_LENGTH,
    }),
  ),
] satisfies readonly FieldDef[];

export const expenseFieldsSchema = toFieldsSchema(EXPENSE_FIELDS);
export type ExpenseFields = z.infer<typeof expenseFieldsSchema>;
