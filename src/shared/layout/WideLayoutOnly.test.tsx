// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WideLayoutOnly, { WIDE_LAYOUT_QUERY } from './WideLayoutOnly';

// 화면 너비를 바꿀 수 있는 가짜 matchMedia (jsdom에는 없다)
function fakeMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      get matches() {
        return query === WIDE_LAYOUT_QUERY && matches;
      },
      addEventListener: (_: string, listener: () => void) =>
        listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) =>
        listeners.delete(listener),
    })),
  );
  return (next: boolean) => {
    matches = next;
    listeners.forEach((listener) => listener());
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('WideLayoutOnly', () => {
  it('좁은 화면에서는 그리지 않고, 넓어지면 그린다 (창 크기를 바꿔도 따라간다)', () => {
    const resize = fakeMatchMedia(false);
    render(<WideLayoutOnly>왼쪽 목록</WideLayoutOnly>);
    expect(screen.queryByText('왼쪽 목록')).toBeNull();

    act(() => resize(true));
    expect(screen.getByText('왼쪽 목록')).toBeTruthy();
    act(() => resize(false));
    expect(screen.queryByText('왼쪽 목록')).toBeNull();
  });

  it('matchMedia가 없으면 좁은 화면으로 본다', () => {
    vi.stubGlobal('matchMedia', undefined);
    render(<WideLayoutOnly>왼쪽 목록</WideLayoutOnly>);
    expect(screen.queryByText('왼쪽 목록')).toBeNull();
  });
});
