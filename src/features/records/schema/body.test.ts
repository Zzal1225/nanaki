import { describe, expect, it } from 'vitest';
import { listBodyMeasurements, MAX_BODY_WEIGHT_KG, toBodyTitle } from './body';
import { bodyFormSchema, recordEntrySchema } from './recordEntry';

const VALID_BODY = {
  id: '0b6e4f0e-2d4c-4c84-9a0c-5a5e1c2f7a31',
  type: 'body',
  occurredAt: '2026-10-21',
  title: '체중 · 허리',
  memo: null,
  tags: [],
  fields: { weight: 68.4, waist: 78 },
};

function isValid(value: unknown) {
  return recordEntrySchema.safeParse(value).success;
}

describe('체형 기록 스키마', () => {
  it('체중만으로 통과 (나머지는 모두 선택)', () => {
    expect(isValid({ ...VALID_BODY, fields: { weight: 68.4 } })).toBe(true);
  });
  it('체중은 필수', () => {
    expect(isValid({ ...VALID_BODY, fields: { waist: 78 } })).toBe(false);
  });
  it('소수 한 자리·상한까지', () => {
    expect(isValid({ ...VALID_BODY, fields: { weight: 68.45 } })).toBe(false);
    expect(
      isValid({ ...VALID_BODY, fields: { weight: MAX_BODY_WEIGHT_KG + 1 } }),
    ).toBe(false);
    expect(
      isValid({ ...VALID_BODY, fields: { weight: 68.4, bodyFat: 18.2 } }),
    ).toBe(true);
  });
});

describe('적은 항목 나열', () => {
  it('폼 순서대로, 적은 것만 (체중 → 허리 → … → 체지방률)', () => {
    expect(
      listBodyMeasurements({ weight: 68.4, bodyFat: 18.2, waist: 78 }).map(
        (measurement) => measurement.label,
      ),
    ).toEqual(['체중', '허리', '체지방률']);
  });
  it('기본 제목은 적은 항목 이름', () => {
    expect(toBodyTitle({ weight: 68.4 })).toBe('체중');
    expect(toBodyTitle({ weight: 68.4, waist: 78, hip: 94 })).toBe(
      '체중 · 허리 · 엉덩이',
    );
  });
});

describe('체형 작성 폼 스키마 (제목 선택)', () => {
  // 작성 폼은 id 없이 받는다
  const input = { ...VALID_BODY, id: undefined };

  it('제목을 비우면 적은 항목 이름이 제목이 된다', () => {
    expect(bodyFormSchema.parse({ ...input, title: '' }).title).toBe(
      '체중 · 허리',
    );
  });
  it('제목을 쓰면 그대로', () => {
    expect(bodyFormSchema.parse({ ...input, title: '아침 공복' }).title).toBe(
      '아침 공복',
    );
  });
});
