import { describe, expect, it } from 'vitest';
import { parseRecordType, RECORD_TYPE_CONFIG } from '../schema/recordTypes';
import {
  getNewRecordMenuItems,
  newRecordHref,
  RECORD_TYPE_ORDER,
} from './newRecordMenu';

describe('RECORD_TYPE_ORDER', () => {
  it('가계부가 첫 번째 (스피드 다이얼에서 엄지에 가장 가까운 자리)', () => {
    expect(RECORD_TYPE_ORDER[0]).toBe('expense');
  });
  it('구현된 타입이 하나도 빠지지 않는다', () => {
    expect([...RECORD_TYPE_ORDER].sort()).toEqual(
      Object.keys(RECORD_TYPE_CONFIG).sort(),
    );
  });
});

describe('getNewRecordMenuItems', () => {
  it('이름은 "○○ 쓰기" (시안 문구)', () => {
    expect(
      getNewRecordMenuItems(RECORD_TYPE_ORDER).map((item) => item.label),
    ).toEqual(['가계부 쓰기', '후기 쓰기', '운동 쓰기']);
  });
  it('받은 타입만 (설정에서 끈 타입은 빠진다)', () => {
    expect(getNewRecordMenuItems(['review']).map((item) => item.type)).toEqual([
      'review',
    ]);
  });
  it('날짜를 주면 모든 항목 주소에 붙는다', () => {
    expect(getNewRecordMenuItems(['expense'], '2026-10-16')[0].href).toBe(
      '/records/new?type=expense&date=2026-10-16',
    );
  });
  // 메뉴가 만든 주소를 작성 화면이 다시 읽었을 때 같은 타입이어야 한다 (홈으로 튕기지 않게)
  it('주소의 type을 작성 화면이 그대로 읽는다 (왕복)', () => {
    for (const item of getNewRecordMenuItems(RECORD_TYPE_ORDER)) {
      const type = new URL(item.href, 'https://x').searchParams.get('type');
      expect(parseRecordType(type)).toBe(item.type);
    }
  });
});

describe('newRecordHref', () => {
  it('/records/new?type=타입', () => {
    expect(newRecordHref('review')).toBe('/records/new?type=review');
  });
  it('날짜를 주면 ?date=도 붙인다 (홈에서 고른 날)', () => {
    expect(newRecordHref('expense', '2026-10-16')).toBe(
      '/records/new?type=expense&date=2026-10-16',
    );
  });
});
