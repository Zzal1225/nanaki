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
    : 'bg-fg-disabled group-data-[state=checked]:bg-accent';

  // 누르는 영역은 버튼(Root) 자체를 44×44로, 보이는 트랙(44×26)은 그 안에 그린다.
  // 예전에는 버튼이 트랙 크기(44×26)였고, 바깥을 44px로 감싼 span은 누름을 스위치에 넘기지 않아 실제로 눌리는 곳은 26px이었다
  // (2026-10-22 모바일 E2E 함정 검사에서 찾음). 트랙 색은 버튼의 data-state를 group으로 읽는다
  return (
    <SwitchPrimitive.Root
      disabled={disabled}
      className={`group flex size-11 shrink-0 items-center rounded-md ${className}`}
      {...rest}
    >
      <span
        className={`flex h-6.5 w-11 items-center rounded-full p-1 transition-colors ${trackClass}`}
      >
        {/* 트랙 44 - 안쪽 여백 4×2 - 손잡이 20 = 16px(translate-x-4)만큼 움직인다 */}
        <SwitchPrimitive.Thumb className='size-5 rounded-full bg-surface transition-transform data-[state=checked]:translate-x-4 data-[state=checked]:bg-accent-foreground' />
      </span>
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
