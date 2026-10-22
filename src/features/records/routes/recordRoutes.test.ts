import { describe, expect, it } from 'vitest';
import {
  openRecordId,
  recordEditHref,
  recordIdFromParams,
  recordTypeFromPath,
  recordViewHref,
} from './recordRoutes';

const params = (query: string) => new URLSearchParams(query);

describe('기록 주소 만들기', () => {
  it('상세·수정은 ?id=', () => {
    expect(recordViewHref('abc')).toBe('/records/view?id=abc');
    expect(recordEditHref('abc')).toBe('/records/edit?id=abc');
  });
  it('검색 조건을 함께 싣는다 (뒤로 가기·PC 왼쪽 결과)', () => {
    expect(recordViewHref('abc', 'q=%EC%B9%B4%ED%8E%98')).toBe(
      '/records/view?q=%EC%B9%B4%ED%8E%98&id=abc',
    );
  });
});

describe('주소에서 읽기', () => {
  it('상세·수정 화면이면 열린 기록 id, 다른 화면이면 null', () => {
    expect(openRecordId('/records/view', params('id=abc&q=x'))).toBe('abc');
    expect(openRecordId('/records/edit', params('id=abc'))).toBe('abc');
    expect(openRecordId('/records', params('id=abc'))).toBeNull();
    expect(openRecordId(null, null)).toBeNull();
    expect(recordIdFromParams(params(''))).toBeNull();
  });
  it('타입 상세는 아는 타입만', () => {
    expect(recordTypeFromPath('/records/type/review')).toBe('review');
    expect(recordTypeFromPath('/records/type/toString')).toBeNull();
    expect(recordTypeFromPath('/records/review')).toBeNull();
  });
});
