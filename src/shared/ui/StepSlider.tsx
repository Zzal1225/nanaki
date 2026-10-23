'use client';

// 'use client' 이유: 끌기·방향키 입력(Radix Slider)과 − + 버튼 누름을 브라우저에서 받는다
import { Minus, Plus } from 'lucide-react';
import { Slider } from 'radix-ui';
import { ICON_SIZE, ICON_STROKE_WIDTH } from './icon';

type StepSliderProps = {
  label: string;
  // 화면에 보이는 값 ("120%"). 화면 읽기 프로그램도 숫자 대신 이 글을 읽는다 (aria-valuetext)
  valueText: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

// 슬라이더 한 줄: 이름 · − · 막대 · + · 값 (시안 P6b 맞춰 자르기). 한 줄에 둬서 모바일에서도 사진 칸을 넓게 남긴다.
// 끄는 것만으로는 잘게 맞추기 어렵고 터치만으로는 키보드 사용자가 못 쓴다 (CLAUDE.md: 모든 조작은 버튼과 키보드로도) →
// − + 버튼(44px)을 두고, 막대는 Radix Slider라 방향키·PageUp/PageDown·Home/End가 된다
export default function StepSlider({
  label,
  valueText,
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
}: StepSliderProps) {
  const nudge = (direction: 1 | -1) =>
    onChange(Math.min(max, Math.max(min, value + direction * step)));
  const buttonClass =
    'inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-fg-primary enabled:hover:bg-surface-hover disabled:text-fg-disabled';

  return (
    <div className='flex items-center gap-2'>
      <span className='w-16 shrink-0 text-body-sm font-medium text-fg-primary'>
        {label}
      </span>
      <button
        type='button'
        onClick={() => nudge(-1)}
        disabled={disabled || value <= min}
        aria-label={`${label} 줄이기`}
        className={buttonClass}
      >
        <Minus
          aria-hidden='true'
          size={ICON_SIZE.sm}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </button>
      <Slider.Root
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={([next]) => {
          if (next !== undefined) onChange(next);
        }}
        // 막대 영역 높이 44px: 막대(6px)를 눌러도 손가락이 닿게
        className='relative flex h-11 min-w-0 flex-1 touch-none items-center select-none'
      >
        <Slider.Track className='relative h-1.5 grow overflow-hidden rounded-full bg-surface-pressed'>
          <Slider.Range className='absolute h-full bg-accent' />
        </Slider.Track>
        <Slider.Thumb
          aria-label={label}
          aria-valuetext={valueText}
          className='block size-6 rounded-full border-2 border-accent bg-surface-raised shadow-card'
        />
      </Slider.Root>
      <button
        type='button'
        onClick={() => nudge(1)}
        disabled={disabled || value >= max}
        aria-label={`${label} 늘리기`}
        className={buttonClass}
      >
        <Plus
          aria-hidden='true'
          size={ICON_SIZE.sm}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </button>
      <span className='w-12 shrink-0 text-right text-body-sm font-semibold text-fg-primary tabular-nums'>
        {valueText}
      </span>
    </div>
  );
}
