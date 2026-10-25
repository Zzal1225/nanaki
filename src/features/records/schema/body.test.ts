import { describe, expect, it } from 'vitest';
import {
  BODY_CONTENT_MESSAGE,
  MAX_BODY_WEIGHT_KG,
  measuresOf,
  toBodyTitle,
} from './body';
import {
  bodyFormSchema,
  bodyFormSchemaFor,
  recordEntrySchema,
} from './recordEntry';

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
  it('체중만, 허리둘레만, 둘 다 모두 통과', () => {
    expect(isValid(VALID_BODY)).toBe(true);
    expect(isValid({ ...VALID_BODY, fields: { waist: 78 } })).toBe(true);
    expect(
      isValid({ ...VALID_BODY, fields: { weight: 68.4, waist: 78 } }),
    ).toBe(true);
  });
  // 사진만 있는 기록: 사진은 photos 표에 있어 이 스키마는 볼 수 없다. 읽기에서 떨어뜨리면 목록에서 사라진다
  it('두 칸이 비어도 읽는다 (사진만 있는 기록)', () => {
    expect(isValid({ ...VALID_BODY, title: '눈바디', fields: {} })).toBe(true);
  });
  it('없어진 항목(체지방률 등)은 떨어뜨린다', () => {
    const result = recordEntrySchema.safeParse({
      ...VALID_BODY,
      fields: { weight: 68.4, waist: 78, bodyFat: 18.2 },
    });
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
  it('적힌 항목으로 제목을 짓는다 (사진만이면 "눈바디")', () => {
    expect(toBodyTitle({ weight: 68.4 })).toBe('체중');
    expect(toBodyTitle({ waist: 78 })).toBe('허리둘레');
    expect(toBodyTitle({ weight: 68.4, waist: 78 })).toBe('체중·허리둘레');
    expect(toBodyTitle({})).toBe('눈바디');
  });
  it('항목은 체중 먼저', () => {
    expect(measuresOf({ waist: 78, weight: 68.4 })).toEqual([
      'weight',
      'waist',
    ]);
    expect(measuresOf({})).toEqual([]);
  });
});

describe('체형 작성 폼 스키마 (체중·허리둘레·사진 중 1개 이상)', () => {
  // 작성 폼은 id 없이, 제목 칸 없이('') 받는다
  const input = { ...VALID_BODY, id: undefined, title: '' };

  it('제목은 적힌 항목 이름으로 채운다', () => {
    expect(bodyFormSchema.parse(input).title).toBe('체중');
    expect(
      bodyFormSchema.parse({ ...input, fields: { weight: 68.4, waist: 78 } })
        .title,
    ).toBe('체중·허리둘레');
  });
  it('둘 다 적어도 된다', () => {
    expect(
      bodyFormSchema.safeParse({
        ...input,
        fields: { weight: 68.4, waist: 78 },
      }).success,
    ).toBe(true);
  });
  it('다 비고 사진도 없으면 "1개 이상" 오류 (체중 칸 아래)', () => {
    const result = bodyFormSchema.safeParse({ ...input, fields: {} });
    expect(result.error?.issues[0]).toMatchObject({
      message: BODY_CONTENT_MESSAGE,
      path: ['fields', 'weight'],
    });
  });
  // 2026-10-25 사용자 요청: 목록의 [눈바디] 대신 무슨 사진인지
  it('사진이 있으면 숫자 없이도 저장, 제목은 붙은 사진 종류 ("정면·측면 사진")', () => {
    const both = bodyFormSchemaFor(['side', 'front']).safeParse({
      ...input,
      fields: {},
    });
    expect(both.success).toBe(true);
    expect(both.data?.title).toBe('정면·측면 사진');
    expect(
      bodyFormSchemaFor(['side']).safeParse({ ...input, fields: {} }).data
        ?.title,
    ).toBe('측면 사진');
    // 숫자가 있으면 사진이 있어도 잰 항목 이름
    expect(
      bodyFormSchemaFor(['front']).safeParse({
        ...input,
        fields: { weight: 68.4 },
      }).data?.title,
    ).toBe('체중');
  });
});
