import { useId, type ComponentProps } from 'react';
import FieldError from './FieldError';

type TextFieldProps = ComponentProps<'input'> & {
  label: string;
  error?: string;
  unit?: string;
};

// 서버 컴포넌트에서도 쓸 수 있게 useState 없이 CSS(focus-within)로 포커스 모양을 만든다
export default function TextField({
  label,
  error,
  unit,
  className = '',
  ...rest
}: TextFieldProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const hasError = Boolean(error);

  return (
    <div className='flex flex-col gap-2'>
      <label
        htmlFor={inputId}
        className='text-body-sm font-medium text-fg-primary'
      >
        {label}
      </label>
      {/* 테두리 1px + 링 1px로 시안의 2px 포커스 테두리를 만들어서 포커스 때 레이아웃이 밀리지 않는다 */}
      <div
        className={`flex h-12 items-center gap-1 rounded-md border bg-surface px-4 ${
          hasError
            ? 'border-danger ring-1 ring-danger'
            : 'border-border focus-within:border-accent focus-within:ring-1 focus-within:ring-accent'
        }`}
      >
        <input
          id={inputId}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          // 컨테이너가 포커스 링을 그리므로 입력창 자체의 기본 윤곽선은 끈다
          className={`min-w-0 flex-1 bg-transparent text-body text-fg-primary outline-none placeholder:text-fg-secondary disabled:text-fg-disabled ${
            unit ? 'text-right font-semibold tabular-nums' : ''
          } ${className}`}
          {...rest}
        />
        {unit && <span className='text-body text-fg-secondary'>{unit}</span>}
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
