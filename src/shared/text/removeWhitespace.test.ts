import { describe, expect, it } from 'vitest';
import { removeWhitespace } from './removeWhitespace';

describe('공백 빼기', () => {
  it('띄어쓰기·줄바꿈·탭·전각 공백을 모두 뺀다', () => {
    expect(removeWhitespace(' 편의점 간식\n\t ')).toBe('편의점간식');
    expect(removeWhitespace('출근　길')).toBe('출근길');
  });
});
