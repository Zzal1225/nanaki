import { useId, type ComponentProps } from 'react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { Check } from 'lucide-react';
import { ICON_SIZE, ICON_STROKE_WIDTH } from './icon';

type CheckboxProps = Omit<
  ComponentProps<typeof CheckboxPrimitive.Root>,
  'id'
> & {
  label: string;
};

export default function Checkbox({
  label,
  disabled,
  className = '',
  ...rest
}: CheckboxProps) {
  const id = useId();
  const boxClass = disabled
    ? 'border-fg-disabled'
    : 'border-fg-secondary data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground';

  return (
    <div className='inline-flex items-center gap-3'>
      <CheckboxPrimitive.Root
        id={id}
        disabled={disabled}
        className={`flex size-5.5 shrink-0 items-center justify-center rounded-sm border-[1.5px] ${boxClass} ${className}`}
        {...rest}
      >
        <CheckboxPrimitive.Indicator>
          <Check
            aria-hidden='true'
            size={ICON_SIZE.sm}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <label
        htmlFor={id}
        className={`flex min-h-11 items-center text-body-sm ${
          disabled ? 'text-fg-disabled' : 'text-fg-primary'
        }`}
      >
        {label}
      </label>
    </div>
  );
}
