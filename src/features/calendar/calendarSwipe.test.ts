import { describe, expect, it } from 'vitest';
import { createSwipeTracker } from './calendarSwipe';

function swipe(path: Array<[number, number]>) {
  const tracker = createSwipeTracker();
  const [first, ...rest] = path.map(([x, y]) => ({ x, y }));
  tracker.start(first);
  rest.slice(0, -1).forEach((point) => tracker.move(point));
  return tracker.end(rest[rest.length - 1] ?? first);
}

describe('캘린더 스와이프 판단', () => {
  it('왼쪽으로 밀면 다음 달(+1), 오른쪽이면 이전 달(-1)', () => {
    expect(
      swipe([
        [200, 100],
        [150, 102],
        [120, 104],
      ]),
    ).toBe(1);
    expect(
      swipe([
        [100, 100],
        [150, 98],
        [180, 96],
      ]),
    ).toBe(-1);
  });

  it('짧게 밀린 것(50px 미만)은 날짜 누르기로 본다', () => {
    expect(
      swipe([
        [200, 100],
        [170, 100],
        [160, 100],
      ]),
    ).toBeNull();
  });

  it('비스듬하면(가로가 세로의 2배 이하) 스와이프가 아니다', () => {
    expect(
      swipe([
        [200, 100],
        [170, 80],
        [120, 60],
      ]),
    ).toBeNull();
  });

  it('세로로 움직이기 시작한 터치는 나중에 옆으로 흘러도 스와이프가 아니다', () => {
    expect(
      swipe([
        [200, 100],
        [200, 130],
        [100, 135],
      ]),
    ).toBeNull();
  });

  it('취소된 터치(다른 손가락·시스템)는 무시한다', () => {
    const tracker = createSwipeTracker();
    tracker.start({ x: 200, y: 100 });
    tracker.cancel();
    expect(tracker.end({ x: 50, y: 100 })).toBeNull();
  });
});
