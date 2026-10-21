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
