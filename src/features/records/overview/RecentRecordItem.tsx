import { ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import type { RecordType } from '../schema/recordTypes';
import { RECORD_TYPE_STYLE } from '../ui/recordTypeStyle';

// 시안 규격: 목록 아이콘 22px (일반 규격 20·24 사이)
const LIST_ICON_SIZE = 22;

type RecentRecordItemProps = {
  type: RecordType;
  title: string;
  // "가계부 · 10.19 (월)"
  subtitle: string;
  value: string;
};

// 기록 객체 전체 대신 화면에 쓰는 값만 받는다 (CLAUDE.md: props는 필요한 것만).
// 상세 화면(13b)이 생기면 이 줄 전체를 /records/[id] 링크로 감싼다. 지금은 누를 곳이 없어서 링크로 만들지 않는다
export default function RecentRecordItem({
  type,
  title,
  subtitle,
  value,
}: RecentRecordItemProps) {
  const style = RECORD_TYPE_STYLE[type];
  const Icon = style.icon;

  return (
    <div className='flex min-h-17 items-center gap-3 rounded-lg bg-surface px-4 py-3 shadow-card'>
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-md ${style.subtleBgClass} ${style.textClass}`}
      >
        <Icon
          aria-hidden='true'
          size={LIST_ICON_SIZE}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </span>
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        {/* 제목이 길면 한 줄로 자른다. min-w-0이 없으면 flex 자식이 줄어들지 않아 잘리지 않는다 */}
        <span className='truncate text-body font-semibold text-fg-primary'>
          {title}
        </span>
        <span className='text-caption font-medium text-fg-secondary tabular-nums'>
          {subtitle}
        </span>
      </div>
      <span className='text-body font-semibold whitespace-nowrap text-fg-primary tabular-nums'>
        {value}
      </span>
    </div>
  );
}
