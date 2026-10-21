'use client';

// 'use client' 이유: "직접 입력" 칸을 열고 닫는 상태와 포커스 이동이 필요하다
import { ToggleGroup } from 'radix-ui';
import { Check } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { ICON_SIZE, ICON_STROKE_WIDTH } from './icon';
import FieldError from './FieldError';

type ChipSelectProps = {
  label: string;
  options: readonly string[];
  value: string | undefined;
  // 선택을 풀면 undefined. 필수 칸이면 검증이 막는다
  onChange: (value: string | undefined) => void;
  // true면 "직접 입력" 칩과 글자 입력칸을 보여 준다
  allowCustom?: boolean;
  error?: string;
};

const CUSTOM_CHIP_VALUE = '__custom__';

const CHIP_CLASS =
  'inline-flex min-h-11 items-center gap-1 rounded-full px-4 text-body-sm ' +
  'border border-border bg-surface font-medium text-fg-primary hover:bg-surface-hover active:bg-surface-pressed ' +
  'data-[state=on]:border-transparent data-[state=on]:bg-fg-primary data-[state=on]:font-semibold data-[state=on]:text-surface';

// 하나만 고르되 다시 눌러 해제할 수 있어야 해서(선택 칸) 라디오가 아니라 토글 그룹이다.
// 화살표 키로 칩 사이를 옮기는 것(roving tabindex)은 Radix가 맡는다
export default function ChipSelect({
  label,
  options,
  value,
  onChange,
  allowCustom = false,
  error,
}: ChipSelectProps) {
  const labelId = useId();
  const errorId = `${labelId}-error`;
  const customInputRef = useRef<HTMLInputElement>(null);

  // 목록 밖 값이 이미 들어 있으면(수정 화면) 처음부터 직접 입력 상태로 보여 준다
  const isCustomValue = value !== undefined && !options.includes(value);
  const [isCustomOpen, setIsCustomOpen] = useState(isCustomValue);
  const selectedChip = isCustomOpen ? CUSTOM_CHIP_VALUE : (value ?? '');
  const hasError = Boolean(error);

  function handleChipChange(next: string) {
    if (next === CUSTOM_CHIP_VALUE) {
      setIsCustomOpen(true);
      onChange(undefined);
      // 칸이 그려진 다음에 포커스를 옮겨야 해서 한 프레임 미룬다
      requestAnimationFrame(() => customInputRef.current?.focus());
      return;
    }
    setIsCustomOpen(false);
    // 같은 칩을 다시 누르면 Radix가 ''를 준다 → 선택 해제
    onChange(next === '' ? undefined : next);
  }

  return (
    <div className='flex flex-col gap-2'>
      <span id={labelId} className='text-body-sm font-medium text-fg-primary'>
        {label}
      </span>
      <ToggleGroup.Root
        type='single'
        value={selectedChip}
        onValueChange={handleChipChange}
        aria-labelledby={labelId}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className='flex flex-wrap gap-2'
      >
        {options.map((option) => (
          <ToggleGroup.Item key={option} value={option} className={CHIP_CLASS}>
            {value === option && !isCustomOpen && <ChipCheck />}
            {option}
          </ToggleGroup.Item>
        ))}
        {allowCustom && (
          <ToggleGroup.Item value={CUSTOM_CHIP_VALUE} className={CHIP_CLASS}>
            {isCustomOpen && <ChipCheck />}
            직접 입력
          </ToggleGroup.Item>
        )}
      </ToggleGroup.Root>
      {isCustomOpen && (
        <input
          ref={customInputRef}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} 직접 입력`}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          // 라벨에 '(선택)'이 붙을 수 있어서 이름을 넣지 않는다 (이름은 위 칩 묶음 제목이 이미 보여 준다)
          placeholder='직접 입력하세요'
          className={`h-12 rounded-md border bg-surface px-4 text-body text-fg-primary outline-none placeholder:text-fg-secondary ${
            hasError
              ? 'border-danger ring-1 ring-danger'
              : 'border-border focus:border-accent focus:ring-1 focus:ring-accent'
          }`}
        />
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function ChipCheck() {
  return (
    <Check
      aria-hidden='true'
      size={ICON_SIZE.sm}
      strokeWidth={ICON_STROKE_WIDTH}
    />
  );
}
