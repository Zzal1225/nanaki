// 홈 캘린더 좌우 스와이프 판단 (Issue #32). 화면 없이 숫자만 받아 테스트한다 (useCalendarSwipe가 터치 이벤트를 넘긴다).
// 스와이프는 지름길일 뿐이다: 버튼(‹ ›)과 PageUp/PageDown이 같은 일을 하고, 여기서 정한 방향도 같은 shiftMonth로 간다

// 이만큼은 옮겨야 스와이프로 본다. 날짜 칸을 누르다 손가락이 조금 밀린 것을 달 넘기기로 보지 않게
export const SWIPE_MIN_DISTANCE_PX = 50;
// 가로 이동이 세로의 이 배수보다 커야 한다: 비스듬한 위아래 스크롤을 달 넘기기로 보지 않게 (Issue #32 예: |dx| > |dy| × 2)
export const SWIPE_AXIS_RATIO = 2;
// 손가락이 이만큼 움직였을 때의 방향으로 이 터치의 성격(가로·세로)을 정한다
export const SWIPE_DECIDE_DISTANCE_PX = 10;

type Point = { x: number; y: number };

export type SwipeTracker = {
  start: (point: Point) => void;
  move: (point: Point) => void;
  // 끝난 터치가 스와이프면 넘길 방향(왼쪽으로 밀면 다음 달 +1, 오른쪽이면 이전 달 -1), 아니면 null
  end: (point: Point) => -1 | 1 | null;
  cancel: () => void;
};

// 터치 하나를 따라가며 판단한다. 처음 10px을 움직인 방향이 세로면 그 터치는 끝까지 스와이프로 보지 않는다
// (Issue #32: 세로로 움직이기 시작하면 그 터치는 스와이프가 아니다) — 스크롤하다 손가락이 옆으로 흘러도 달이 넘어가지 않게
export function createSwipeTracker(): SwipeTracker {
  let origin: Point | null = null;
  let isVertical = false;

  return {
    start(point) {
      origin = point;
      isVertical = false;
    },
    move(point) {
      if (!origin || isVertical) return;
      const dx = Math.abs(point.x - origin.x);
      const dy = Math.abs(point.y - origin.y);
      if (Math.max(dx, dy) < SWIPE_DECIDE_DISTANCE_PX) return;
      if (dy > dx) isVertical = true;
    },
    end(point) {
      const from = origin;
      origin = null;
      if (!from || isVertical) return null;
      const dx = point.x - from.x;
      const dy = point.y - from.y;
      if (Math.abs(dx) < SWIPE_MIN_DISTANCE_PX) return null;
      if (Math.abs(dx) <= Math.abs(dy) * SWIPE_AXIS_RATIO) return null;
      return dx < 0 ? 1 : -1;
    },
    cancel() {
      origin = null;
    },
  };
}
