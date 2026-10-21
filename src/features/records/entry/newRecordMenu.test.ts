import { describe, expect, it } from 'vitest';
import { parseRecordType, RECORD_TYPE_CONFIG } from '../schema/recordTypes';
import { NEW_RECORD_MENU_ITEMS, newRecordHref } from './newRecordMenu';

describe('NEW_RECORD_MENU_ITEMS', () => {
  it('가계부가 첫 번째 (스피드 다이얼에서 엄지에 가장 가까운 자리)', () => {
    expect(NEW_RECORD_MENU_ITEMS[0].type).toBe('expense');
  });
  it('구현된 타입이 하나도 빠지지 않는다', () => {
    const menuTypes = NEW_RECORD_MENU_ITEMS.map((item) => item.type).sort();
    expect(menuTypes).toEqual(Object.keys(RECORD_TYPE_CONFIG).sort());
  });
  it('이름은 "○○ 쓰기" (시안 문구)', () => {
    expect(NEW_RECORD_MENU_ITEMS.map((item) => item.label)).toEqual([
      '가계부 쓰기',
      '후기 쓰기',
    ]);
  });
  // 메뉴가 만든 주소를 작성 화면이 다시 읽었을 때 같은 타입이어야 한다 (홈으로 튕기지 않게)
  it('주소의 type을 작성 화면이 그대로 읽는다 (왕복)', () => {
    for (const item of NEW_RECORD_MENU_ITEMS) {
      const type = new URL(item.href, 'https://x').searchParams.get('type');
      expect(parseRecordType(type)).toBe(item.type);
    }
  });
});

describe('newRecordHref', () => {
  it('/records/new?type=타입', () => {
    expect(newRecordHref('review')).toBe('/records/new?type=review');
  });
});
