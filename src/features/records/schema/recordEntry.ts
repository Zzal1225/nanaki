import { z } from 'zod';
import { BODY_ONLY_ONE_MESSAGE, bodyFieldsSchema, toBodyTitle } from './body';
import { expenseFieldsSchema } from './expense';
import { maxLengthMessage, requiredInputMessage } from './fieldKinds';
import { reviewFieldsSchema } from './review';
import { workoutFieldsSchema } from './workout';

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
  // 날짜 칸을 비우면 ''가 온다. 그때는 형식 오류 대신 "골라 주세요"
  occurredAt: z.iso.date({
    error: (issue) =>
      issue.input === '' ? '날짜를 골라 주세요' : '날짜 형식이 아니에요',
  }),
  title: z
    .string()
    .trim()
    .min(1, { error: requiredInputMessage('제목') })
    .max(MAX_TITLE_LENGTH, { error: maxLengthMessage(MAX_TITLE_LENGTH) }),
  // DB에서 메모 없는 기록은 null로 온다
  memo: z
    .string()
    .max(MAX_MEMO_LENGTH, { error: maxLengthMessage(MAX_MEMO_LENGTH) })
    .nullable(),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(MAX_TAG_LENGTH, { error: maxLengthMessage(MAX_TAG_LENGTH) }),
    )
    .max(MAX_TAGS, { error: `태그는 ${MAX_TAGS}개까지 달 수 있어요` }),
});

export const expenseRecordSchema = baseRecordSchema.extend({
  type: z.literal('expense'),
  fields: expenseFieldsSchema,
});

export const reviewRecordSchema = baseRecordSchema.extend({
  type: z.literal('review'),
  fields: reviewFieldsSchema,
});

export const workoutRecordSchema = baseRecordSchema.extend({
  type: z.literal('workout'),
  fields: workoutFieldsSchema,
});

export const bodyRecordSchema = baseRecordSchema.extend({
  type: z.literal('body'),
  fields: bodyFieldsSchema,
});

// 제목을 입력받지 않는 타입(운동·체형)의 작성 폼용 제목 칸: 폼에 칸이 없어 늘 ''로 온다.
// 저장된 기록의 제목은 그대로 필수다. DB title이 not null이고 상세 화면·검색에 늘 이름이 있어야 해서,
// 폼 스키마의 transform이 정해진 이름으로 채운다. 그래서 마이그레이션 없이 끝난다.
// transform은 객체를 ZodPipe로 바꿔 .omit·.extend를 더 쓸 수 없으므로 맨 마지막에 붙인다
const optionalTitleSchema = z
  .string()
  .trim()
  .max(MAX_TITLE_LENGTH, { error: maxLengthMessage(MAX_TITLE_LENGTH) });

// 운동: 제목 칸이 없고 종목 이름("러닝")을 제목으로 저장한다 (2026-10-22 사용자 결정: "하체 데이" 같은 말은 태그·메모에).
// 예전에 사용자가 쓴 제목이 있는 기록도 고쳐 저장하면 종목 이름으로 바뀐다 (감수한 점)
export const workoutFormSchema = workoutRecordSchema
  .omit({ id: true })
  .extend({ title: optionalTitleSchema })
  .transform((values) => ({
    ...values,
    title: values.fields.activity,
  }));

// 체형: 제목 칸이 없고 잰 항목 이름("체중" / "허리둘레")을 제목으로 저장한다
export const bodyFormSchema = bodyRecordSchema
  .omit({ id: true })
  .extend({ title: optionalTitleSchema })
  // 새로 쓰거나 고칠 때는 하나만 (2026-10-22 사용자 결정). 오류는 체중 칸 아래에 보여 준다
  .refine(
    ({ fields }) => fields.weight === undefined || fields.waist === undefined,
    { error: BODY_ONLY_ONE_MESSAGE, path: ['fields', 'weight'] },
  )
  .transform((values) => ({
    ...values,
    title: toBodyTitle(values.fields),
  }));

// z.union이 아니라 판별 유니온: type을 먼저 보고 맞는 스키마 하나만 검사해서 오류가 그 타입 기준으로 정확히 나온다
export const recordEntrySchema = z.discriminatedUnion('type', [
  expenseRecordSchema,
  reviewRecordSchema,
  workoutRecordSchema,
  bodyRecordSchema,
]);
export type RecordEntry = z.infer<typeof recordEntrySchema>;

// 타입 하나의 기록만: RecordEntryOf<'expense'> = 가계부 기록 (판별 유니온에서 그 타입만 꺼낸다)
export type RecordEntryOf<T extends RecordEntry['type']> = Extract<
  RecordEntry,
  { type: T }
>;
