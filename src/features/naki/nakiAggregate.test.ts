import { describe, expect, it } from 'vitest';
import { getMetricFields, toNakiAggregate } from './nakiAggregate';

describe('계산 조건 거르기 (AI 답을 믿지 않는다)', () => {
  it('타입마다 숫자 칸, 첫 칸이 기본 (루틴은 없다)', () => {
    expect(getMetricFields('expense').map((f) => f.name)).toEqual(['amount']);
    expect(getMetricFields('workout').map((f) => f.name)).toEqual([
      'minutes',
      'distance',
    ]);
    expect(getMetricFields('body').map((f) => f.name)).toEqual([
      'weight',
      'waist',
    ]);
    expect(getMetricFields('review').map((f) => f.name)).toEqual(['rating']);
    expect(getMetricFields('routine')).toEqual([]);
  });

  it('그 타입의 숫자 칸이면 그대로, 아니면 기본 칸', () => {
    expect(toNakiAggregate('min', 'weight', 'body')).toEqual({
      intent: 'min',
      field: 'weight',
    });
    expect(toNakiAggregate('sum', 'distance', 'workout')).toEqual({
      intent: 'sum',
      field: 'distance',
    });
    expect(toNakiAggregate('avg', 'category', 'expense')).toEqual({
      intent: 'avg',
      field: 'amount',
    });
    expect(toNakiAggregate('max', null, 'review')).toEqual({
      intent: 'max',
      field: 'rating',
    });
  });

  it('타입이 없거나 숫자 칸이 없는 타입이면 건수, 모르는 의도는 목록', () => {
    expect(toNakiAggregate('sum', 'amount', null)).toEqual({
      intent: 'count',
      field: null,
    });
    expect(toNakiAggregate('avg', null, 'routine')).toEqual({
      intent: 'count',
      field: null,
    });
    expect(toNakiAggregate('median', null, 'expense')).toEqual({
      intent: 'list',
      field: null,
    });
    expect(toNakiAggregate(null, null, 'expense')).toEqual({
      intent: 'list',
      field: null,
    });
    expect(toNakiAggregate('count', 'amount', 'expense')).toEqual({
      intent: 'count',
      field: null,
    });
  });
});
