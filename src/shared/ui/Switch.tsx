import { useId, type ComponentProps } from 'react';
import { Switch as SwitchPrimitive } from 'radix-ui';

type SwitchControlProps = ComponentProps<typeof SwitchPrimitive.Root>;

// 스위치 모양만 (라벨 없음). 라벨 자리가 아이콘·설명까지 있는 줄(설정의 타입 켜기)은
// 이것을 쓰고 id/aria-labelledby로 직접 라벨을 잇는다. 모양은 Switch와 한 곳에서 관리된다.
// Radix가 role="switch", Space 키 토글, 상태(data-state)를 맡고 여기서는 모양만 입힌다
export function SwitchControl({
  disabled,
  className = '',
  ...rest
}: SwitchControlProps) {
  // 비활성은 켜짐 여부와 상관없이 회색이어야 해서 data-state 색 대신 따로 고른다
  const trackClass = disabled
    ? 'bg-surface-pressed'
    : 'bg-fg-disabled data-[state=checked]:bg-accent';

  return (
    <SwitchPrimitive.Root
      disabled={disabled}
      className={`flex h-6.5 w-11 shrink-0 items-center rounded-full p-1 transition-colors ${trackClass} ${className}`}
      {...rest}
    >
      {/* 트랙 44 - 안쪽 여백 4×2 - 손잡이 20 = 16px(translate-x-4)만큼 움직인다 */}
      <SwitchPrimitive.Thumb className='size-5 rounded-full bg-surface transition-transform data-[state=checked]:translate-x-4 data-[state=checked]:bg-accent-foreground' />
    </SwitchPrimitive.Root>
  );
}

type SwitchProps = Omit<SwitchControlProps, 'id'> & {
  label: string;
};

// 글자 라벨이 붙은 스위치
export default function Switch({ label, disabled, ...rest }: SwitchProps) {
  const id = useId();

  return (
    <div className='inline-flex items-center gap-3'>
      <SwitchControl id={id} disabled={disabled} {...rest} />
      {/* 라벨을 눌러도 켜지고, 높이 44px로 누르는 영역을 넓힌다 */}
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
