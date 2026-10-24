// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import BodyClass from './BodyClass';

afterEach(cleanup);

describe('useBodyClass', () => {
  it('보이는 동안만 body에 클래스가 붙고, 사라지면(숨김·떠남) 떨어진다', () => {
    const { unmount } = render(<BodyClass name='login-screen-body' />);
    expect(document.body.classList.contains('login-screen-body')).toBe(true);
    unmount();
    expect(document.body.classList.contains('login-screen-body')).toBe(false);
  });
});
