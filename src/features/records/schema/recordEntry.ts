import { z } from 'zod';
import { expenseFieldsSchema } from './expense';
import { reviewFieldsSchema } from './review';

// 메모·제목 상한은 DB check와 같은 값이어야 한다 (supabase/migrations).
// DB는 앱을 거치지 않는 요청까지 막는 마지막 방어선, Zod는 사용자에게 빠르고 친절한 오류를 주는 역할
export const MAX_MEMO_LENGTH = 500;
export const MAX_TITLE_LENGTH = 40;
export const MAX_TAG_LENGTH = 10;
export const MAX_TAGS = 5;

// createdAt·updatedAt·deletedAt은 넣지 않는다. 사용자가 입력하는 값이 아니라 서버가 붙이는 값이라서
export const baseRecordSchema = z.object({
  id: z.uuid(),
  // Date로 바꾸지 않고 로컬 'YYYY-MM-DD' 문자열 그대로. 시간대 변환으로 자정 무렵 기록이 전날로 밀리지 않게
  occurredAt: z.iso.date({ error: '날짜 형식이 아니에요' }),
  title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
  // DB에서 메모 없는 기록은 null로 온다
  memo: z.string().max(MAX_MEMO_LENGTH).nullable(),
  tags: z.array(z.string().trim().min(1).max(MAX_TAG_LENGTH)).max(MAX_TAGS),
});

export const expenseRecordSchema = baseRecordSchema.extend({
  type: z.literal('expense'),
  fields: expenseFieldsSchema,
});

export const reviewRecordSchema = baseRecordSchema.extend({
  type: z.literal('review'),
  fields: reviewFieldsSchema,
});

// z.union이 아니라 판별 유니온: type을 먼저 보고 맞는 스키마 하나만 검사해서 오류가 그 타입 기준으로 정확히 나온다
export const recordEntrySchema = z.discriminatedUnion('type', [
  expenseRecordSchema,
  reviewRecordSchema,
]);
export type RecordEntry = z.infer<typeof recordEntrySchema>;
