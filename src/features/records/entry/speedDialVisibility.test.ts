import { describe, expect, it } from 'vitest';
import { shouldShowSpeedDial } from './speedDialVisibility';

describe('shouldShowSpeedDial', () => {
  it('기록을 보는 화면에서는 보인다', () => {
    expect(shouldShowSpeedDial('/')).toBe(true);
    expect(shouldShowSpeedDial('/records')).toBe(true);
    expect(shouldShowSpeedDial('/records/abc')).toBe(true);
    expect(shouldShowSpeedDial('/records/type/expense')).toBe(true);
  });
  it('작성·수정 중에는 숨는다', () => {
    expect(shouldShowSpeedDial('/records/new')).toBe(false);
    expect(shouldShowSpeedDial('/records/abc/edit')).toBe(false);
    // 루틴 만들기·수정도 작성 화면이다 (예전 규칙은 기록 작성만 봐서 여기서 + 버튼이 떴다)
    expect(shouldShowSpeedDial('/routines/new')).toBe(false);
    expect(shouldShowSpeedDial('/routines/abc/edit')).toBe(false);
  });
  it('설정에서는 숨는다 (Issue #47)', () => {
    expect(shouldShowSpeedDial('/settings')).toBe(false);
  });
});
