import { describe, expect, it } from 'vitest';
import { parseRecordType } from './recordTypes';

describe('parseRecordType', () => {
  it('아는 타입은 그대로 돌려준다', () => {
    expect(parseRecordType('expense')).toBe('expense');
    expect(parseRecordType('review')).toBe('review');
  });
  it('아직 없는 타입은 null', () => {
    expect(parseRecordType('workout')).toBeNull();
  });
  it('값이 없거나 배열(?type=a&type=b)이면 null', () => {
    expect(parseRecordType(undefined)).toBeNull();
    expect(parseRecordType(['expense', 'review'])).toBeNull();
  });
  // in 연산자는 모든 객체가 물려받는 이름(toString, constructor ...)도 true라서 막아야 한다
  it('객체가 물려받는 이름(toString)은 null', () => {
    expect(parseRecordType('toString')).toBeNull();
    expect(parseRecordType('constructor')).toBeNull();
  });
});
