import { X } from 'lucide-react';
import { ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import type { AppliedFilter } from './searchFilters';

type AppliedFilterChipsProps = {
  filters: readonly AppliedFilter[];
  onRemove: (id: string) => void;
};

// 적용된 조건 칩 (시안 14a: "기간 이번 달 ×"). 시트를 다시 열지 않고 하나씩 풀 수 있다.
// 칩 전체가 버튼이다: ×만 누르게 하면 누를 곳이 14px로 작다 (터치 영역 44px, CLAUDE.md)
export default function AppliedFilterChips({
  filters,
  onRemove,
}: AppliedFilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <ul
      aria-label='적용된 필터'
      className='flex flex-wrap gap-2 px-4 pt-3 md:px-6'
    >
      {filters.map((filter) => (
        <li key={filter.id}>
          <button
            type='button'
            aria-label={`${filter.label} ${filter.value} 필터 풀기`}
            onClick={() => onRemove(filter.id)}
            className='inline-flex min-h-11 items-center gap-1 rounded-full border border-fg-primary bg-surface pr-3 pl-3 text-body-sm hover:bg-surface-hover active:bg-surface-pressed'
          >
            <span className='text-fg-secondary'>{filter.label}</span>
            <b className='font-semibold text-fg-primary tabular-nums'>
              {filter.value}
            </b>
            <X
              aria-hidden='true'
              size={14}
              strokeWidth={ICON_STROKE_WIDTH}
              className='ml-1 text-fg-secondary'
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
