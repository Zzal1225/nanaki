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
      {/* 글자 수는 칸 안 오른쪽 아래에 둔다 (2026-10-23 사용자 요청: 칸 밖 한 줄이 아래 저장 버튼과의 여백을 키웠다).
          pb-8로 마지막 줄이 글자 수 밑으로 들어가지 않게 자리를 비운다 */}
      <div className='relative flex flex-col'>
        <textarea
          id={inputId}
          maxLength={maxLength}
          aria-invalid={hasError}
          aria-describedby={`${counterId}${hasError ? ` ${errorId}` : ''}`}
          className={`min-h-28 resize-y rounded-md border bg-surface px-4 pt-3 pb-8 text-body text-fg-primary outline-none placeholder:text-fg-secondary ${
            hasError
              ? 'border-danger ring-1 ring-danger'
              : 'border-border focus:border-accent focus:ring-1 focus:ring-accent'
          } ${className}`}
          {...rest}
        />
        {/* pointer-events-none: 글자 수 위를 눌러도 칸에 포커스가 간다. bg-surface: 길게 쓴 글이 스크롤되며 밑으로 지나가도 읽히게.
            right-4: PC의 크기 조절 손잡이(오른쪽 아래 모서리)와 겹치지 않게 */}
        <span
          id={counterId}
          className='pointer-events-none absolute right-4 bottom-2 bg-surface text-caption text-fg-secondary tabular-nums'
        >
          {length}/{maxLength}
        </span>
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
