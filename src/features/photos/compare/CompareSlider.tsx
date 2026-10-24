'use client';

// 'use client' 이유: 끌기(포인터)·방향키로 손잡이 위치를 바꾼다
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { clampPosition, POSITION_STEP } from './bodyCompare';

type CompareSliderProps = {
  // 왼쪽(앞 날짜)·오른쪽(뒤 날짜)에 그릴 것 (사진 또는 체험 예시 그림). 둘 다 틀을 꽉 채운다
  before: ReactNode;
  after: ReactNode;
  beforeLabel: string;
  afterLabel: string;
  // 0~100: 앞 날짜가 왼쪽에서부터 보이는 비율 (= 손잡이의 가로 위치 %)
  position: number;
  onPositionChange: (position: number) => void;
};

// 비교 슬라이더 (step4 37d, 시안 20·P6d). 두 사진을 같은 3:4 틀에 겹쳐 두고, 위 사진(앞 날짜)을 손잡이 위치까지만 보여 준다.
// 맞춰 자르기·카메라가 같은 틀·실루엣으로 찍게 했기 때문에 겹쳐 놓으면 몸의 변화가 손잡이를 따라 보인다.
// 조작: 사진 어디든 끌기, 손잡이에 초점을 두고 방향키(5%)·Home/End, 아래 위치 버튼(부르는 쪽). 터치만이 아니라 키보드로도 (CLAUDE.md)
export default function CompareSlider({
  before,
  after,
  beforeLabel,
  afterLabel,
  position,
  onPositionChange,
}: CompareSliderProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  function positionAt(clientX: number): number {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return position;
    return clampPosition(((clientX - rect.left) / rect.width) * 100);
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    // 손가락이 틀 밖으로 나가도 계속 따라오게 붙잡는다
    event.currentTarget.setPointerCapture(event.pointerId);
    isDraggingRef.current = true;
    onPositionChange(positionAt(event.clientX));
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (isDraggingRef.current) onPositionChange(positionAt(event.clientX));
  }

  function endDrag() {
    isDraggingRef.current = false;
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    const next =
      event.key === 'ArrowLeft' || event.key === 'ArrowDown'
        ? position - POSITION_STEP
        : event.key === 'ArrowRight' || event.key === 'ArrowUp'
          ? position + POSITION_STEP
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? 100
              : null;
    if (next === null) return;
    event.preventDefault();
    onPositionChange(clampPosition(next));
  }

  const badgeClass =
    'absolute bottom-3 flex h-7 items-center rounded-full bg-fg-primary px-3 text-caption font-semibold text-surface tabular-nums';

  return (
    <div
      ref={frameRef}
      // pan-y: 사진 위에서도 위아래 스크롤은 되고, 좌우 끌기만 손잡이로 받는다
      className='relative aspect-[3/4] w-full touch-pan-y overflow-hidden rounded-lg bg-surface-hover select-none'
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className='absolute inset-0'>{after}</div>
      {/* 위 사진(앞 날짜)을 오른쪽에서 잘라 손잡이 왼쪽만 보이게 */}
      <div
        className='absolute inset-0'
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {before}
      </div>
      <span className={`${badgeClass} left-3`}>{beforeLabel}</span>
      <span className={`${badgeClass} right-3`}>{afterLabel}</span>
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-surface-raised'
        style={{ left: `${position}%` }}
      />
      <div
        role='slider'
        tabIndex={0}
        aria-label='비교 위치'
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={position}
        aria-valuetext={`${beforeLabel} ${position}% · ${afterLabel} ${100 - position}%`}
        onKeyDown={handleKey}
        className='absolute top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-border bg-surface-raised text-fg-primary shadow-float'
        style={{ left: `${position}%` }}
      >
        <ChevronLeft
          aria-hidden='true'
          size={14}
          strokeWidth={ICON_STROKE_WIDTH}
        />
        <ChevronRight
          aria-hidden='true'
          size={14}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </div>
    </div>
  );
}
