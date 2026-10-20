import { describe, it, expect } from 'vitest';
import { resolveIsDark } from './theme';

// describe('테스트 대상 이름', () => {
//   it('입력이 이러면 결과가 이렇다', () => {
//     expect(함수(입력들)).toBe(정답);
//   });
//   it('...', () => { ... });   ← 케이스마다 하나씩
// });

describe('resolveIsDark', () => {
  it('시스템 따르기를 골랐고 컴퓨터가 다크면 다크다', () => {
    expect(resolveIsDark('system', true)).toBe(true);
  });

  it('시스템 따르기를 골랐고 컴퓨터가 라이트면 다크가 아니다', () => {
    expect(resolveIsDark('system', false)).toBe(false);
  });

  it('라이트를 골랐으면 컴퓨터가 다크여도 다크가 아니다', () => {
    expect(resolveIsDark('light', true)).toBe(false);
  });

  it('라이트를 골랐고 컴퓨터가 라이트면 다크가 아니다', () => {
    expect(resolveIsDark('light', false)).toBe(false);
  });

  it('다크를 골랐고 컴퓨터가 다크면 다크다', () => {
    expect(resolveIsDark('dark', true)).toBe(true);
  });

  it('다크를 골랐으면 컴퓨터가 라이트여도 다크다', () => {
    expect(resolveIsDark('dark', false)).toBe(true);
  });
});
