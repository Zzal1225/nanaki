import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  expenseFieldsSchema,
  MAX_EXPENSE_AMOUNT,
  MAX_EXPENSE_LABEL_LENGTH,
  type ExpenseFields,
} from './expense';

// 정상 값 하나에서 한 칸씩만 바꿔, 실패 원인이 그 칸이라는 게 드러나게 한다
const VALID = { amount: 15000, category: '식비', paymentMethod: '카드' };

function isValid(value: unknown) {
  return expenseFieldsSchema.safeParse(value).success;
}

describe('expenseFieldsSchema', () => {
  it('정상 값은 통과', () => {
    expect(isValid(VALID)).toBe(true);
  });
  it('결제수단을 빼도 통과', () => {
    expect(isValid({ amount: 15000, category: '식비' })).toBe(true);
  });
  it('목록에 없는 분류(반려동물)도 통과', () => {
    expect(isValid({ ...VALID, category: '반려동물' })).toBe(true);
  });
  it('금액 0은 실패', () => {
    expect(isValid({ ...VALID, amount: 0 })).toBe(false);
  });
  it('음수 금액은 실패', () => {
    expect(isValid({ ...VALID, amount: -15000 })).toBe(false);
  });
  it('소수 금액은 실패', () => {
    expect(isValid({ ...VALID, amount: 1500.5 })).toBe(false);
  });
  // 경계 바로 안쪽과 바깥쪽을 함께 검사해야 상한이 정확히 지켜지는지 알 수 있다
  it('상한과 같은 금액은 통과', () => {
    expect(isValid({ ...VALID, amount: MAX_EXPENSE_AMOUNT })).toBe(true);
  });
  it('상한을 넘는 금액은 실패', () => {
    expect(isValid({ ...VALID, amount: MAX_EXPENSE_AMOUNT + 1 })).toBe(false);
  });
  it('공백만 있는 분류는 실패', () => {
    expect(isValid({ ...VALID, category: '   ' })).toBe(false);
  });
  it('길이 상한을 넘는 분류는 실패', () => {
    const tooLong = '가'.repeat(MAX_EXPENSE_LABEL_LENGTH + 1);
    expect(isValid({ ...VALID, category: tooLong })).toBe(false);
  });
  it('분류 앞뒤 공백은 지워서 저장', () => {
    const result = expenseFieldsSchema.parse({ ...VALID, category: ' 식비 ' });
    expect(result.category).toBe('식비');
  });
  it('정의에 없는 키는 실패시키지 않고 지움', () => {
    const result = expenseFieldsSchema.parse({ ...VALID, foo: 1 });
    expect(result).not.toHaveProperty('foo');
  });
});

describe('ExpenseFields 타입', () => {
  it('amount는 number', () => {
    expectTypeOf<ExpenseFields['amount']>().toEqualTypeOf<number>();
  });
  it('paymentMethod는 string | undefined', () => {
    expectTypeOf<ExpenseFields['paymentMethod']>().toEqualTypeOf<
      string | undefined
    >();
  });
});
