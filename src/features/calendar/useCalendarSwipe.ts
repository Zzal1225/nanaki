'use client';

import {
  useRef,
  useSyncExternalStore,
  type TouchEvent,
  type TouchEventHandler,
} from 'react';
import { createSwipeTracker, type SwipeTracker } from './calendarSwipe';

// 손가락 기기인지는 기기를 바꾸지 않는 한 그대로라 구독할 것이 없다 (useInAppCamera와 같은 방식)
function subscribe(): () => void {
  return () => {};
}

function getSnapshot(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  );
}

// 서버(미리 그리기)는 기기를 모른다 → 꺼 둔 채 시작한다 (CLAUDE.md: 기기 능력 분기는 마운트 뒤, 판단 전에는 끔)
function getServerSnapshot(): boolean {
  return false;
}

export type SwipeHandlers = {
  onTouchStart: TouchEventHandler;
  onTouchMove: TouchEventHandler;
  onTouchEnd: TouchEventHandler;
  onTouchCancel: TouchEventHandler;
};

function pointOf(event: TouchEvent, list: 'touches' | 'changedTouches') {
  const touch = event[list][0];
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
}

// 홈 캘린더 좌우 스와이프로 달 넘기기 (Issue #32). 손가락 기기(pointer: coarse)에서만 터치 핸들러를 돌려주고, 아니면 null.
// 마우스 끌기로는 넘기지 않는다: PC에는 ‹ › 버튼과 PageUp/PageDown이 있고, 끌어서 글자를 고르는 동작과 부딪힌다.
// 손가락 두 개(확대)는 스와이프로 보지 않는다
export function useCalendarSwipe(
  onShift: (delta: -1 | 1) => void,
): SwipeHandlers | null {
  const isCoarse = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  // 터치 한 번의 상태(시작점·세로 여부)는 다시 그리기와 상관없이 이어져야 해서 ref에 둔다. 읽기는 핸들러 안에서만 (그리는 중에 ref를 읽지 않는다)
  const trackerRef = useRef<SwipeTracker | null>(null);
  if (!isCoarse) return null;

  function tracker(): SwipeTracker {
    trackerRef.current ??= createSwipeTracker();
    return trackerRef.current;
  }
  return {
    onTouchStart: (event) => {
      const point = pointOf(event, 'touches');
      if (event.touches.length !== 1 || !point) {
        tracker().cancel();
        return;
      }
      tracker().start(point);
    },
    onTouchMove: (event) => {
      const point = pointOf(event, 'touches');
      if (event.touches.length !== 1 || !point) {
        tracker().cancel();
        return;
      }
      tracker().move(point);
    },
    onTouchEnd: (event) => {
      const point = pointOf(event, 'changedTouches');
      if (!point) return;
      const delta = tracker().end(point);
      if (delta) onShift(delta);
    },
    onTouchCancel: () => tracker().cancel(),
  };
}
