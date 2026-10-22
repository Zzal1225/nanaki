import { describe, expect, it } from 'vitest';
import {
  canHideType,
  filterVisibleEntries,
  getVisibleTypes,
  setTypeHidden,
} from './typeVisibility';

describe('getVisibleTypes', () => {
  it('숨긴 것만 빼고 정해진 순서대로', () => {
    expect(getVisibleTypes([])).toEqual([
      'expense',
      'review',
      'workout',
      'body',
      'routine',
    ]);
    expect(getVisibleTypes(['expense'])).toEqual([
      'review',
      'workout',
      'body',
      'routine',
    ]);
  });
  it('앱에 아직 없는 타입 이름은 영향이 없다', () => {
    expect(getVisibleTypes(['sleep'])).toEqual([
      'expense',
      'review',
      'workout',
      'body',
      'routine',
    ]);
  });
});

describe('canHideType', () => {
  it('켜진 타입이 둘 이상이면 끌 수 있다', () => {
    expect(canHideType([], 'expense')).toBe(true);
  });
  it('마지막 하나는 끌 수 없다', () => {
    expect(
      canHideType(['expense', 'workout', 'body', 'routine'], 'review'),
    ).toBe(false);
  });
  it('이미 숨긴 타입은 (다시 켜는 것이라) 늘 가능', () => {
    expect(canHideType(['expense'], 'expense')).toBe(true);
  });
});

describe('setTypeHidden', () => {
  it('숨기기·다시 보이기', () => {
    expect(setTypeHidden([], 'review', true)).toEqual(['review']);
    expect(setTypeHidden(['review'], 'review', false)).toEqual([]);
  });
  it('같은 이름이 두 번 들어가지 않는다', () => {
    expect(setTypeHidden(['review'], 'review', true)).toEqual(['review']);
  });
  it('앱이 모르는 타입 이름은 지우지 않고 남긴다 (다른 기기·새 버전의 설정)', () => {
    expect(setTypeHidden(['sleep'], 'expense', true)).toEqual([
      'sleep',
      'expense',
    ]);
  });
});

describe('filterVisibleEntries', () => {
  it('숨긴 타입의 기록을 뺀다', () => {
    const entries = [
      { id: '1', type: 'expense' as const },
      { id: '2', type: 'review' as const },
    ];
    expect(filterVisibleEntries(entries, ['review'])).toEqual([entries[1]]);
  });
});
