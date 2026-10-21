import { describe, expect, it } from 'vitest';
import { formatFieldValue, type FieldView } from './fieldView';

const AMOUNT: FieldView = {
  kind: 'number',
  name: 'amount',
  label: '금액',
  unit: '원',
};
const CATEGORY: FieldView = {
  kind: 'select',
  name: 'category',
  label: '분류',
  options: [],
  allowCustom: true,
};
const RATING: FieldView = { kind: 'rating', name: 'rating', label: '별점' };
const PLACE: FieldView = {
  kind: 'text',
  name: 'place',
  label: '장소',
  maxLength: 40,
};

describe('formatFieldValue', () => {
  it('숫자는 천 단위 쉼표 + 단위 (부호는 붙이지 않는다)', () => {
    expect(formatFieldValue(AMOUNT, 12500)).toBe('12,500원');
  });
  it('선택·글자는 그대로', () => {
    expect(formatFieldValue(CATEGORY, '식비')).toBe('식비');
    expect(formatFieldValue(PLACE, '성수')).toBe('성수');
  });
  it('별점은 ★ n.0', () => {
    expect(formatFieldValue(RATING, 4)).toBe('★ 4.0');
  });
  // 선택 칸을 비웠으면 상세 표에서 그 줄을 그리지 않는다
  it('값이 없으면 null', () => {
    expect(formatFieldValue(PLACE, undefined)).toBeNull();
    expect(formatFieldValue(AMOUNT, undefined)).toBeNull();
  });
});
