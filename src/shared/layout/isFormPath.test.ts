import { describe, expect, it } from 'vitest';
import { isFormPath } from './isFormPath';

describe('작성·수정 화면', () => {
  it('기록·루틴의 새로 쓰기와 수정', () => {
    expect(isFormPath('/records/new')).toBe(true);
    expect(isFormPath('/records/abc/edit')).toBe(true);
    expect(isFormPath('/routines/new')).toBe(true);
    expect(isFormPath('/routines/abc/edit')).toBe(true);
  });
  it('보기·목록 화면은 아니다 (이름에 new·edit가 들어 있어도)', () => {
    expect(isFormPath('/')).toBe(false);
    expect(isFormPath('/records')).toBe(false);
    expect(isFormPath('/records/abc')).toBe(false);
    expect(isFormPath('/records/newest')).toBe(false);
    expect(isFormPath('/records/search')).toBe(false);
  });
});
