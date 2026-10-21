import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import type { RecordType } from '@/features/records/schema/recordTypes';
import { RECORD_TYPE_STYLE } from '@/features/records/ui/recordTypeStyle';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';

export type DayRecordItem = {
  id: string;
  title: string;
  value: string;
};

type DayTypeRowProps = {
  type: RecordType;
  // "가계부 3건": "-32,000원"
  label: string;
  value: string;
  items: DayRecordItem[];
  isOpen: boolean;
  onToggle: () => void;
};

// 시안 규격: 타입 아이콘 18px
const TYPE_ICON_SIZE = 18;

// 하루 요약의 타입 한 줄. 누르면 그 타입 기록이 아래로 펼쳐진다 (시안 expanded).
// 펼침 여부는 부모(DaySummary)가 들고 있다: 날짜가 바뀌면 한꺼번에 접히게 하려고
export default function DayTypeRow({
  type,
  label,
  value,
  items,
  isOpen,
  onToggle,
}: DayTypeRowProps) {
  const style = RECORD_TYPE_STYLE[type];
  const Icon = style.icon;
  const listId = `day-${type}-records`;

  return (
    <li className='border-t border-border first:border-t-0'>
      <button
        type='button'
        // 화면 읽기 프로그램에 "펼침/접힘"과 펼쳐지는 목록을 알려 준다
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={onToggle}
        className='flex min-h-13 w-full items-center gap-3 pr-2 pl-3 text-left hover:bg-surface-hover active:bg-surface-pressed'
      >
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-md ${style.subtleBgClass} ${style.textClass}`}
        >
          <Icon
            aria-hidden='true'
            size={TYPE_ICON_SIZE}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </span>
        <span className='min-w-0 flex-1 truncate text-body text-fg-primary'>
          <b className='font-semibold'>{label}</b>
          {/* 가운뎃점(·)은 "가계부 3건 · 점심 · 식비"처럼 나열로 읽혀서, 이름과 값 사이는 콜론으로 (가계부 1건: -12,500원) */}
          <span className='text-fg-secondary'>: </span>
          <span className='tabular-nums'>{value}</span>
        </span>
        <span className='flex size-11 items-center justify-center text-fg-secondary'>
          <ChevronDown
            aria-hidden='true'
            size={ICON_SIZE.md}
            strokeWidth={ICON_STROKE_WIDTH}
            className={isOpen ? 'rotate-180' : ''}
          />
        </span>
      </button>
      {isOpen && (
        <ul id={listId} className='pr-4 pb-1 pl-14'>
          {items.map((item) => (
            <li key={item.id} className='border-t border-border'>
              {/* 펼친 기록은 상세로 이어진다. 요약에서 바로 고치거나 지우러 갈 수 있게 */}
              <Link
                href={`/records/${item.id}`}
                className='flex min-h-11 items-center justify-between gap-3 text-body-sm text-fg-primary hover:underline'
              >
                <span className='min-w-0 truncate'>{item.title}</span>
                <span className='shrink-0 font-semibold tabular-nums'>
                  {item.value}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
