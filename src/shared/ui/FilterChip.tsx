import type { ComponentProps } from 'react';
import { Check } from 'lucide-react';
import { ICON_SIZE, ICON_STROKE_WIDTH } from './icon';

type FilterChipProps = ComponentProps<'button'> & {
  isSelected: boolean;
};

// 누를 수 있는 칩은 44px(시안 규칙). 표시용 칩(타입·AI 조건)은 28px로 따로 만든다
export default function FilterChip({
  isSelected,
  type = 'button',
  className = '',
  children,
  ...rest
}: FilterChipProps) {
  return (
    <button
      type={type}
      aria-pressed={isSelected}
      className={`inline-flex min-h-11 items-center gap-1 rounded-full px-4 text-body-sm ${
        isSelected
          ? 'bg-fg-primary font-semibold text-surface'
          : 'border border-border bg-surface font-medium text-fg-primary hover:bg-surface-hover active:bg-surface-pressed'
      } ${className}`}
      {...rest}
    >
      {isSelected && (
        <Check
          aria-hidden='true'
          size={ICON_SIZE.sm}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      )}
      {children}
    </button>
  );
}
