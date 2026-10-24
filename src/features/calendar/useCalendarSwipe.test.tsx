// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCalendarSwipe } from './useCalendarSwipe';

function SwipeArea({ onShift }: { onShift: (delta: -1 | 1) => void }) {
  const swipe = useCalendarSwipe(onShift);
  return (
    <div {...swipe} data-testid='area'>
      {swipe ? '켜짐' : '꺼짐'}
    </div>
  );
}

function stubPointer(isCoarse: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query === '(pointer: coarse)' && isCoarse,
    })),
  );
}

const touch = (x: number, y: number) => ({ clientX: x, clientY: y });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useCalendarSwipe', () => {
  it('손가락 기기에서 왼쪽으로 밀면 다음 달, 오른쪽이면 이전 달', () => {
    stubPointer(true);
    const onShift = vi.fn();
    render(<SwipeArea onShift={onShift} />);
    const area = screen.getByTestId('area');

    fireEvent.touchStart(area, { touches: [touch(300, 100)] });
    fireEvent.touchMove(area, { touches: [touch(260, 102)] });
    fireEvent.touchEnd(area, { changedTouches: [touch(200, 104)] });
    expect(onShift).toHaveBeenLastCalledWith(1);

    fireEvent.touchStart(area, { touches: [touch(100, 100)] });
    fireEvent.touchMove(area, { touches: [touch(140, 100)] });
    fireEvent.touchEnd(area, { changedTouches: [touch(200, 100)] });
    expect(onShift).toHaveBeenLastCalledWith(-1);
  });

  it('두 손가락(확대)은 넘기지 않는다', () => {
    stubPointer(true);
    const onShift = vi.fn();
    render(<SwipeArea onShift={onShift} />);
    const area = screen.getByTestId('area');

    fireEvent.touchStart(area, { touches: [touch(300, 100), touch(100, 100)] });
    fireEvent.touchEnd(area, { changedTouches: [touch(150, 100)] });
    expect(onShift).not.toHaveBeenCalled();
  });

  it('마우스 기기에서는 꺼져 있다 (버튼·PageUp/PageDown만)', () => {
    stubPointer(false);
    render(<SwipeArea onShift={vi.fn()} />);
    expect(screen.getByText('꺼짐')).toBeTruthy();
  });
});
