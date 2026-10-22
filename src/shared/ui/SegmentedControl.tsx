import type { ComponentProps } from 'react';
import { RadioGroup } from 'radix-ui';

type SegmentOption = {
  value: string;
  label: string;
};

// 여러 개 중 하나만 고르고 해제는 안 되므로 의미상 라디오 그룹이다. 화살표 키 이동은 Radix가 맡는다
type SegmentedControlProps = Omit<
  ComponentProps<typeof RadioGroup.Root>,
  'children' | 'orientation'
> & {
  options: readonly SegmentOption[];
  // 보이는 제목이 없어서 스크린 리더용 이름을 꼭 받는다
  'aria-label': string;
};

// 높이: 버튼 하나가 44px(CLAUDE.md 터치 영역)이 되게 묶음은 54px = 44 + 안쪽 여백 4×2 + 테두리 1×2.
// 예전에는 묶음을 44px로 두어 버튼이 34px였다 (2026-10-22 모바일 E2E 함정 검사에서 찾음, tests/e2e/helpers/mobileChecks)
export default function SegmentedControl({
  options,
  className = '',
  ...rest
}: SegmentedControlProps) {
  return (
    <RadioGroup.Root
      orientation='horizontal'
      className={`inline-flex h-13.5 rounded-md border border-border bg-surface p-1 text-body-sm font-semibold ${className}`}
      {...rest}
    >
      {options.map((option) => (
        <RadioGroup.Item
          key={option.value}
          value={option.value}
          className='h-full min-w-14 rounded-sm px-3 text-fg-secondary data-[state=checked]:bg-fg-primary data-[state=checked]:text-surface'
        >
          {option.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
