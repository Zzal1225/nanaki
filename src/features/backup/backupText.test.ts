import { describe, expect, it } from 'vitest';
import { dataCountText, importResultMessage } from './backupText';

describe('importResultMessage', () => {
  it('더한 수, 건너뛴 수, 읽지 못한 수를 한 줄로', () => {
    expect(importResultMessage({ added: 12, skipped: 3, invalid: 1 })).toBe(
      '12개를 더했어요 · 이미 있는 3개는 건너뛰었어요 · 읽지 못한 1개는 뺐어요',
    );
  });
  it('같은 파일을 다시 불러오면 실패가 아니라 "더할 것이 없어요"', () => {
    expect(importResultMessage({ added: 0, skipped: 40, invalid: 0 })).toBe(
      '더할 것이 없어요 · 이미 있는 40개는 건너뛰었어요',
    );
  });
});

describe('dataCountText', () => {
  it('기록·사진 수, 사진 수를 모르면 기록만', () => {
    expect(dataCountText(312, 48)).toBe('기록 312개 · 사진 48장');
    expect(dataCountText(312, null)).toBe('기록 312개');
  });
});
