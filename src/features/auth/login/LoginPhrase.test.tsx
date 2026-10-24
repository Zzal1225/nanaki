// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import LoginPhrase from './LoginPhrase';

afterEach(cleanup);

describe('LoginPhrase', () => {
  it('화면 읽기 프로그램에는 글자 조각이 아니라 문장 하나로 읽힌다', () => {
    render(<LoginPhrase />);
    // 보이는 글자 조각은 모두 숨겨져 있고, 읽히는 것은 sr-only 문장뿐이다
    expect(screen.getByText('나는 나를 키운다')).toBeTruthy();
    const pieces = document.querySelectorAll('[aria-hidden="true"]');
    expect([...pieces].map((piece) => piece.textContent).join('')).toBe(
      '나는 나를 키운다',
    );
  });

  it('나·나·키만 남는 글자(key)이고 나머지는 접히는 글자(fold)다', () => {
    render(<LoginPhrase />);
    const keys = [...document.querySelectorAll('.login-key')].map(
      (piece) => piece.textContent,
    );
    expect(keys.join('')).toBe('나나키');
    expect(document.querySelectorAll('.login-fold')).toHaveLength(6);
  });
});
