import { describe, expect, it } from 'vitest';
import {
  BODY_ONLY_ONE_MESSAGE,
  MAX_BODY_WEIGHT_KG,
  measureOf,
  toBodyTitle,
} from './body';
import { bodyFormSchema, recordEntrySchema } from './recordEntry';

const VALID_BODY = {
  id: '0b6e4f0e-2d4c-4c84-9a0c-5a5e1c2f7a31',
  type: 'body',
  occurredAt: '2026-10-21',
  title: '체중',
  memo: null,
  tags: [],
  fields: { weight: 68.4 },
};

function isValid(value: unknown) {
  return recordEntrySchema.safeParse(value).success;
}

describe('체형 기록 스키마 (저장된 기록)', () => {
  it('체중만, 허리둘레만 모두 통과', () => {
    expect(isValid(VALID_BODY)).toBe(true);
    expect(isValid({ ...VALID_BODY, fields: { waist: 78 } })).toBe(true);
  });
  it('둘 다 비면 실패', () => {
    expect(isValid({ ...VALID_BODY, fields: {} })).toBe(false);
  });
  // 규칙을 바꾸기 전에 저장된 기록이 목록에서 사라지면 안 된다
  it('둘 다 있는 예전 기록도 읽는다, 없어진 항목(체지방률 등)은 떨어뜨린다', () => {
    const result = recordEntrySchema.safeParse({
      ...VALID_BODY,
      fields: { weight: 68.4, waist: 78, bodyFat: 18.2 },
    });
    expect(result.success).toBe(true);
    expect(result.data?.fields).toEqual({ weight: 68.4, waist: 78 });
  });
  it('소수 한 자리·상한까지', () => {
    expect(isValid({ ...VALID_BODY, fields: { weight: 68.45 } })).toBe(false);
    expect(
      isValid({ ...VALID_BODY, fields: { weight: MAX_BODY_WEIGHT_KG + 1 } }),
    ).toBe(false);
  });
});

describe('잰 항목과 제목', () => {
  it('체중 기록은 "체중", 허리둘레 기록은 "허리둘레" (둘 다 있으면 체중)', () => {
    expect(toBodyTitle({ weight: 68.4 })).toBe('체중');
    expect(toBodyTitle({ waist: 78 })).toBe('허리둘레');
    expect(measureOf({ weight: 68.4, waist: 78 })).toBe('weight');
  });
});

describe('체형 작성 폼 스키마', () => {
  // 작성 폼은 id 없이, 제목 칸 없이('') 받는다
  const input = { ...VALID_BODY, id: undefined, title: '' };

  it('제목은 잰 항목 이름으로 채운다', () => {
    expect(bodyFormSchema.parse(input).title).toBe('체중');
    expect(
      bodyFormSchema.parse({ ...input, fields: { waist: 78 } }).title,
    ).toBe('허리둘레');
  });
  it('둘 다 적으면 "하나만" 오류 (체중 칸 아래)', () => {
    const result = bodyFormSchema.safeParse({
      ...input,
      fields: { weight: 68.4, waist: 78 },
    });
    expect(result.error?.issues[0]).toMatchObject({
      message: BODY_ONLY_ONE_MESSAGE,
      path: ['fields', 'weight'],
    });
  });
  it('둘 다 비면 "입력해 주세요" 오류', () => {
    const result = bodyFormSchema.safeParse({ ...input, fields: {} });
    expect(result.success).toBe(false);
  });
});
