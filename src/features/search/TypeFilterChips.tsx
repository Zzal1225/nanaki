import { Search } from 'lucide-react';
import {
  RECORD_TYPE_CONFIG,
  type RecordType,
} from '@/features/records/schema/recordTypes';
import { RECORD_TYPE_STYLE } from '@/features/records/ui/recordTypeStyle';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';

type TypeFilterChipsProps = {
  types: readonly RecordType[];
  selected: RecordType | null;
  // 아직 결과가 없으면(검색 전·불러오는 중) null → 건수 없이 칩만
  counts: Record<RecordType | 'all', number> | null;
  onSelect: (type: RecordType | null) => void;
};

// 검색 결과의 타입 칩 (시안 14a): 전체 · 가계부 6 · 후기 3 · 운동 0(흐림).
// 칩마다 aria-pressed로 "골라짐"을 알린다. 결과가 0인 칩은 눌러도 빈 목록이라 막는다 (고른 칩은 0이어도 풀 수 있게 둔다)
export default function TypeFilterChips({
  types,
  selected,
  counts,
  onSelect,
}: TypeFilterChipsProps) {
  const chips: {
    key: RecordType | 'all';
    type: RecordType | null;
    label: string;
  }[] = [
    { key: 'all', type: null, label: '전체' },
    ...types.map((type) => ({
      key: type,
      type,
      label: RECORD_TYPE_CONFIG[type].label,
    })),
  ];

  return (
    // 칩이 많으면 가로로 밀어 본다. 줄바꿈하면 결과 목록이 화면 아래로 밀린다
    <div
      role='group'
      aria-label='타입'
      className='flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:px-6'
    >
      {chips.map(({ key, type, label }) => {
        const count = counts?.[key] ?? null;
        const isSelected = selected === type;
        const isDisabled = !isSelected && count === 0;
        const Icon = type ? RECORD_TYPE_STYLE[type].icon : Search;
        // 고른 칩은 진하게(시안), 나머지는 타입 색. 클래스는 통째로 적어야 Tailwind가 만든다 (recordTypeStyle)
        const colorClass = isSelected
          ? 'bg-fg-primary text-surface font-semibold'
          : isDisabled
            ? 'bg-surface-hover text-fg-disabled font-medium'
            : type
              ? `${RECORD_TYPE_STYLE[type].subtleBgClass} ${RECORD_TYPE_STYLE[type].textClass} font-semibold hover:opacity-80`
              : 'border border-border bg-surface text-fg-primary font-semibold hover:bg-surface-hover';
        return (
          <button
            key={key}
            type='button'
            aria-pressed={isSelected}
            disabled={isDisabled}
            onClick={() => onSelect(type)}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3 text-body-sm ${colorClass}`}
          >
            <Icon
              aria-hidden='true'
              size={ICON_SIZE.sm}
              strokeWidth={ICON_STROKE_WIDTH}
            />
            {label}
            {count !== null && <span className='tabular-nums'>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
