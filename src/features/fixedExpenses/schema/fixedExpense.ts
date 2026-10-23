import { z } from 'zod';
import {
  MAX_EXPENSE_AMOUNT,
  MAX_EXPENSE_LABEL_LENGTH,
} from '@/features/records/schema/expense';
import { maxLengthMessage } from '@/features/records/schema/fieldKinds';
import { scheduleSchema } from '@/shared/schedule/schedule';

// 고정지출 (step3, DB: fixed_expenses). "매달 5일 통신비 55,000원".
// 규칙만 담고, 그날 만들어진 가계부 기록은 records에 있다 (CLAUDE.md: 규칙과 수행 결과를 나눈다)

// 만들어질 가계부 기록의 제목이 된다. 기록 제목 상한(DB records_title_length_check)과 같은 값
export const MAX_FIXED_EXPENSE_NAME_LENGTH = 40;

// 자동으로 만든 가계부 기록에 붙는 태그 (2026-10-23 사용자 결정). DB 함수(record_due_fixed_expenses)와 같은 글자
export const FIXED_EXPENSE_TAG = '고정지출';

// 공통 반복 규칙(Schedule) 중 "매달 n일"만 쓴다 (시안 18). 요일 반복은 고정지출에 필요한 경우가 없다
const monthlyScheduleSchema = scheduleSchema.options[1];
export type MonthlySchedule = z.infer<typeof monthlyScheduleSchema>;

// 금액·분류·결제수단 규칙은 가계부 기록과 같다: 이 값이 그대로 기록의 fields가 된다
export const fixedExpenseInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: '이름을 입력해 주세요' })
    .max(MAX_FIXED_EXPENSE_NAME_LENGTH, {
      error: maxLengthMessage(MAX_FIXED_EXPENSE_NAME_LENGTH),
    }),
  amount: z
    .number({ error: '금액을 입력해 주세요' })
    .int({ error: '정수로 입력해 주세요' })
    .positive({ error: '0보다 큰 값을 입력해 주세요' })
    .max(MAX_EXPENSE_AMOUNT, {
      error: `${MAX_EXPENSE_AMOUNT.toLocaleString('ko-KR')}원까지 입력할 수 있어요`,
    }),
  category: z
    .string()
    .trim()
    .min(1, { error: '분류를 골라 주세요' })
    .max(MAX_EXPENSE_LABEL_LENGTH, {
      error: maxLengthMessage(MAX_EXPENSE_LABEL_LENGTH),
    }),
  paymentMethod: z
    .string()
    .trim()
    .min(1)
    .max(MAX_EXPENSE_LABEL_LENGTH, {
      error: maxLengthMessage(MAX_EXPENSE_LABEL_LENGTH),
    })
    .optional(),
  schedule: monthlyScheduleSchema,
});
export type FixedExpenseInput = z.infer<typeof fixedExpenseInputSchema>;

// 저장된 고정지출 = 입력값 + 서버가 아는 값
export const fixedExpenseSchema = fixedExpenseInputSchema.extend({
  id: z.uuid(),
  // 'YYYY-MM-DD'. 이 날부터의 결제일만 기록한다
  startDate: z.iso.date(),
  // 마지막으로 가계부 기록을 만든 결제일. null = 아직 한 번도 안 만듦
  lastRecordedOn: z.iso.date().nullable(),
});
export type FixedExpense = z.infer<typeof fixedExpenseSchema>;
