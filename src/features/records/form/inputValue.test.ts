import { describe, expect, it } from 'vitest';
import {
  emptyToNull,
  emptyToUndefined,
  formatDecimalInput,
  formatNumberInput,
  parseDecimalInput,
  parseNumberInput,
} from './inputValue';

describe('parseNumberInput', () => {
  it('숫자 글자를 숫자로', () => {
    expect(parseNumberInput('12500')).toBe(12500);
  });
  it('쉼표 등 숫자가 아닌 글자는 버린다 (표시용 쉼표가 다시 들어와도 안전)', () => {
    expect(parseNumberInput('12,500')).toBe(12500);
    expect(parseNumberInput('12,500원')).toBe(12500);
  });
  // 0으로 바꾸면 필수 칸 오류 대신 "0보다 커야 한다"는 엉뚱한 오류가 나온다
  it('빈 칸은 0이 아니라 undefined', () => {
    expect(parseNumberInput('')).toBeUndefined();
    expect(parseNumberInput('원')).toBeUndefined();
  });
});

describe('formatNumberInput', () => {
  it('천 단위 쉼표를 붙인다', () => {
    expect(formatNumberInput(12500)).toBe('12,500');
  });
  it('값이 없으면 빈 칸', () => {
    expect(formatNumberInput(undefined)).toBe('');
  });
  it('표시한 값을 다시 읽으면 원래 숫자 (왕복)', () => {
    expect(parseNumberInput(formatNumberInput(1234567))).toBe(1234567);
  });
});

describe('빈 칸 변환', () => {
  it("선택 글자 칸: ''는 undefined, 나머지는 그대로", () => {
    expect(emptyToUndefined('')).toBeUndefined();
    expect(emptyToUndefined('성수')).toBe('성수');
  });
  it("메모: ''는 null, 나머지는 그대로", () => {
    expect(emptyToNull('')).toBeNull();
    expect(emptyToNull('맛있었다')).toBe('맛있었다');
  });
});

describe('parseDecimalInput (소수 한 자리)', () => {
  it('점을 치는 중에도 글자를 그대로 둔다 (값은 5)', () => {
    expect(parseDecimalInput('5.', 1)).toEqual({ text: '5.', value: 5 });
  });
  it('소수 자리가 넘치면 잘라 낸다 (반올림하지 않음)', () => {
    expect(parseDecimalInput('5.55', 1)).toEqual({ text: '5.5', value: 5.5 });
  });
  it('두 번째 점과 숫자가 아닌 글자는 버린다', () => {
    expect(parseDecimalInput('1.2.3km', 1)).toEqual({
      text: '1.2',
      value: 1.2,
    });
  });
  it('숫자가 없으면 값 없음 (빈 칸, 점만)', () => {
    expect(parseDecimalInput('', 1)).toEqual({ text: '', value: undefined });
    expect(parseDecimalInput('.', 1)).toEqual({ text: '.', value: undefined });
  });
  it('점으로 시작해도 숫자로 읽는다', () => {
    expect(parseDecimalInput('.5', 1)).toEqual({ text: '.5', value: 0.5 });
  });
});

describe('formatDecimalInput', () => {
  it('값을 그대로 글자로, 없으면 빈 칸', () => {
    expect(formatDecimalInput(5.5)).toBe('5.5');
    expect(formatDecimalInput(undefined)).toBe('');
  });
});
