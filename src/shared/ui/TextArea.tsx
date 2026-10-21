import { useId, type ComponentProps } from 'react';
import FieldError from './FieldError';

type TextAreaProps = Omit<ComponentProps<'textarea'>, 'maxLength'> & {
  label: string;
  // 글자 수 표시(120/500)에도 쓰므로 필수
  maxLength: number;
  // 지금 글자 수. 상태를 이 컴포넌트가 갖지 않아서 부르는 쪽이 넘긴다
  length: number;
  error?: string;
};

export default function TextArea({
  label,
  maxLength,
  length,
  error,
  className = '',
  ...rest
}: TextAreaProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const counterId = `${inputId}-counter`;
  const hasError = Boolean(error);

  return (
    <div className='flex flex-col gap-2'>
      <label
        htmlFor={inputId}
        className='text-body-sm font-medium text-fg-primary'
      >
        {label}
      </label>
      <textarea
        id={inputId}
        maxLength={maxLength}
        aria-invalid={hasError}
        aria-describedby={`${counterId}${hasError ? ` ${errorId}` : ''}`}
        className={`min-h-28 resize-y rounded-md border bg-surface px-4 py-3 text-body text-fg-primary outline-none placeholder:text-fg-secondary ${
          hasError
            ? 'border-danger ring-1 ring-danger'
            : 'border-border focus:border-accent focus:ring-1 focus:ring-accent'
        } ${className}`}
        {...rest}
      />
      {/* 오류가 없을 때도 글자 수는 오른쪽에 붙어 있게 한다 */}
      <div className='flex items-start justify-between gap-2 text-caption'>
        <FieldError id={errorId} message={error} />
        <span id={counterId} className='ml-auto text-fg-secondary tabular-nums'>
          {length}/{maxLength}
        </span>
      </div>
    </div>
  );
}
