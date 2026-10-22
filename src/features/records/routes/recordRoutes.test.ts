import { describe, expect, it } from 'vitest';
import { recordIdFromPath, recordTypeFromPath } from './recordRoutes';

describe('주소에서 기록 id', () => {
  it('상세와 수정 주소', () => {
    expect(recordIdFromPath('/records/abc')).toBe('abc');
    expect(recordIdFromPath('/records/abc/edit')).toBe('abc');
  });
  it('같은 자리의 다른 화면·다른 모양은 null', () => {
    expect(recordIdFromPath('/records/new')).toBeNull();
    expect(recordIdFromPath('/records/search')).toBeNull();
    expect(recordIdFromPath('/records/type/expense')).toBeNull();
    expect(recordIdFromPath('/records')).toBeNull();
    expect(recordIdFromPath('/records/abc/edit/more')).toBeNull();
  });
});

describe('주소에서 타입', () => {
  it('아는 타입만', () => {
    expect(recordTypeFromPath('/records/type/review')).toBe('review');
    expect(recordTypeFromPath('/records/type/toString')).toBeNull();
    expect(recordTypeFromPath('/records/review')).toBeNull();
  });
});
