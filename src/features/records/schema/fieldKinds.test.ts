import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import {
  customSelectField,
  numberField,
  optional,
  ratingField,
  RATING_MAX,
  RATING_MIN,
  selectField,
  textField,
  toFieldsSchema,
} from './fieldKinds';

// 빌더가 만든 schema만 꺼내 검사한다. 규칙 자체는 expense·review 테스트가 자세히 본다
function isValid(schema: z.ZodType, value: unknown) {
  return schema.safeParse(value).success;
}

describe('빌더', () => {
  it('numberField는 화면 정보를 그대로 담고 kind는 number', () => {
    const field = numberField({
      name: 'amount',
      label: '금액',
      unit: '원',
      max: 100,
    });
    expect(field).toMatchObject({
      name: 'amount',
      kind: 'number',
      label: '금액',
      unit: '원',
    });
  });
  it('numberField schema는 양의 정수·상한 이하만 통과', () => {
    const { schema } = numberField({ name: 'amount', label: '금액', max: 100 });
    expect(isValid(schema, 100)).toBe(true);
    expect(isValid(schema, 101)).toBe(false);
    expect(isValid(schema, 0)).toBe(false);
    expect(isValid(schema, 1.5)).toBe(false);
  });
  it('customSelectField는 목록 밖 값도 통과하고 allowCustom은 true', () => {
    const field = customSelectField({
      name: 'c',
      label: '분류',
      options: ['식비'],
      maxLength: 5,
    });
    expect(field.allowCustom).toBe(true);
    expect(isValid(field.schema, '반려동물')).toBe(true);
    expect(isValid(field.schema, '   ')).toBe(false);
    expect(isValid(field.schema, '가'.repeat(6))).toBe(false);
  });
  it('selectField는 목록 안 값만 통과하고 allowCustom은 false', () => {
    const field = selectField({
      name: 'k',
      label: '종류',
      options: ['장소', '제품'],
    });
    expect(field.allowCustom).toBe(false);
    expect(isValid(field.schema, '장소')).toBe(true);
    expect(isValid(field.schema, '음식')).toBe(false);
  });
  it('ratingField는 RATING_MIN~RATING_MAX 정수만 통과', () => {
    const { schema } = ratingField({ name: 'r', label: '별점' });
    expect(isValid(schema, RATING_MIN)).toBe(true);
    expect(isValid(schema, RATING_MAX)).toBe(true);
    expect(isValid(schema, RATING_MIN - 1)).toBe(false);
    expect(isValid(schema, RATING_MAX + 1)).toBe(false);
  });
  it('textField는 trim 후 1자 이상·상한 이하만 통과', () => {
    const { schema } = textField({ name: 't', label: '장소', maxLength: 3 });
    expect(isValid(schema, '성수')).toBe(true);
    expect(isValid(schema, '   ')).toBe(false);
    expect(isValid(schema, '가나다라')).toBe(false);
  });
});

describe('optional', () => {
  const field = optional(
    textField({ name: 'place', label: '장소', maxLength: 10 }),
  );

  it('값이 없어도 통과하고 isOptional은 true', () => {
    expect(isValid(field.schema, undefined)).toBe(true);
    expect(field.isOptional).toBe(true);
  });
  it('값이 있으면 원래 규칙으로 검사', () => {
    expect(isValid(field.schema, '   ')).toBe(false);
  });
  it('화면 정보는 그대로', () => {
    expect(field).toMatchObject({ name: 'place', kind: 'text', label: '장소' });
  });
});

describe('toFieldsSchema', () => {
  const schema = toFieldsSchema([
    numberField({ name: 'amount', label: '금액', max: 100 }),
    optional(textField({ name: 'memo', label: '메모', maxLength: 10 })),
  ]);

  it('정의의 name이 객체 키가 된다', () => {
    expect(isValid(schema, { amount: 10, memo: '점심' })).toBe(true);
    expect(isValid(schema, { amount: 10 })).toBe(true);
    expect(isValid(schema, { memo: '점심' })).toBe(false);
  });
  it('타입도 name·schema에서 만들어진다', () => {
    expectTypeOf<z.infer<typeof schema>>().toEqualTypeOf<{
      amount: number;
      memo?: string | undefined;
    }>();
  });
});

// 화면에 그대로 보이는 문구라서 고정해 둔다. 기본 문구("예상 타입은 number…")로 돌아가면 여기서 잡힌다
describe('사용자에게 보이는 오류 문구', () => {
  function firstMessage(schema: z.ZodType, value: unknown) {
    return schema.safeParse(value).error?.issues[0].message;
  }

  it('숫자 칸을 비우면 "○○을 입력해 주세요", 상한을 넘으면 단위까지', () => {
    const { schema } = numberField({
      name: 'a',
      label: '금액',
      unit: '원',
      max: 10000,
    });
    expect(firstMessage(schema, undefined)).toBe('금액을 입력해 주세요');
    expect(firstMessage(schema, 10001)).toBe('10,000원까지 입력할 수 있어요');
  });
  it('선택 칸을 안 고르거나 직접 입력을 비우면 "○○를 골라 주세요"', () => {
    const custom = customSelectField({
      name: 'c',
      label: '분류',
      options: [],
      maxLength: 5,
    });
    expect(firstMessage(custom.schema, undefined)).toBe('분류를 골라 주세요');
    expect(firstMessage(custom.schema, '  ')).toBe('분류를 골라 주세요');
    const fixed = selectField({ name: 'k', label: '대상', options: ['장소'] });
    expect(firstMessage(fixed.schema, undefined)).toBe('대상을 골라 주세요');
  });
  it('별점을 안 고르면 "별점을 골라 주세요"', () => {
    const { schema } = ratingField({ name: 'r', label: '별점' });
    expect(firstMessage(schema, undefined)).toBe('별점을 골라 주세요');
  });
  it('글자 수를 넘으면 "○자까지 쓸 수 있어요"', () => {
    const { schema } = textField({ name: 't', label: '장소', maxLength: 3 });
    expect(firstMessage(schema, '가나다라')).toBe('3자까지 쓸 수 있어요');
  });
});
