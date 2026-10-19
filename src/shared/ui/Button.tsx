import type { ComponentProps } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant;
  isLoading?: boolean;
};

const BASE_CLASS =
  'relative inline-flex min-h-11 items-center justify-center rounded-md px-4 text-body-sm font-semibold';

// enabled: 접두사는 비활성·로딩 중(disabled 속성이 붙은 상태)에 hover·pressed 색이 안 나오게 한다
const ENABLED_CLASS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-foreground enabled:hover:bg-accent-hover enabled:active:bg-accent-pressed',
  secondary:
    'border border-border bg-surface text-fg-primary enabled:hover:bg-surface-hover enabled:active:bg-surface-pressed',
  ghost:
    'text-fg-primary enabled:hover:bg-surface-hover enabled:active:bg-surface-pressed',
  danger:
    'bg-danger text-accent-foreground enabled:hover:bg-danger-hover enabled:active:bg-danger-pressed',
};

const DISABLED_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-surface-pressed text-fg-disabled',
  secondary: 'border border-border bg-surface text-fg-disabled',
  ghost: 'text-fg-disabled',
  danger: 'bg-surface-pressed text-fg-disabled',
};

// 서버·클라이언트 어느 쪽에서도 쓸 수 있도록 상태 없이 props만으로 그린다
export default function Button({
  variant = 'primary',
  isLoading = false,
  disabled = false,
  type = 'button', // form 안에서 실수로 제출되지 않도록 기본값은 button
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const stateClass = disabled ? DISABLED_CLASS[variant] : ENABLED_CLASS[variant];

  return (
    <button
      type={type}
      // 로딩 중 중복 클릭 방지. 로딩 모양은 비활성 모양과 달라서 색 클래스는 disabled 여부만 본다
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={`${BASE_CLASS} ${stateClass} ${className}`}
      {...rest}
    >
      {/* 숨기지 않고 투명하게 두는 이유: 버튼 너비가 변하지 않고 스크린 리더가 이름을 계속 읽는다 */}
      <span className={isLoading ? 'opacity-0' : undefined}>{children}</span>
      {isLoading && (
        <span
          aria-hidden='true'
          className='absolute size-4.5 animate-spin rounded-full border-2 border-current border-t-transparent'
        />
      )}
    </button>
  );
}
