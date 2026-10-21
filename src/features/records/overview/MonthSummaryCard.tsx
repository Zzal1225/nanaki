import Link from 'next/link';
import { ICON_STROKE_WIDTH, ICON_SIZE } from '@/shared/ui/icon';
import { RECORD_TYPE_CONFIG, type RecordType } from '../schema/recordTypes';
import { RECORD_TYPE_STYLE } from '../ui/recordTypeStyle';

type MonthSummaryCardProps = {
  type: RecordType;
  metric: string;
  value: string;
  // 기록이 없을 때는 값을 흐린 색으로 (시안 빈 상태: "어떤 숫자가 쌓일지 미리 보여준다")
  isEmpty: boolean;
  // 그리드 한 줄을 다 차지할지 (첫 카드, 홀수 개일 때 마지막 카드)
  isWide: boolean;
  // 누르면 그 타입의 이번 달 상세로
  href: string;
};

// 표시만 한다. 값 계산은 부르는 쪽(RecordsOverview)과 recordPresentation이 맡는다. 카드 전체가 타입 상세로 가는 링크
export default function MonthSummaryCard({
  type,
  metric,
  value,
  isEmpty,
  isWide,
  href,
}: MonthSummaryCardProps) {
  const style = RECORD_TYPE_STYLE[type];
  const Icon = style.icon;

  return (
    <Link
      href={href}
      className={`flex flex-col gap-2 rounded-lg bg-surface px-4 py-3 shadow-card hover:bg-surface-hover active:bg-surface-pressed ${isWide ? 'col-span-2' : ''}`}
    >
      <div className='flex items-center gap-2'>
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-md ${style.subtleBgClass} ${style.textClass}`}
        >
          <Icon
            aria-hidden='true'
            size={ICON_SIZE.sm}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </span>
        <span className='text-body-sm font-semibold text-fg-primary'>
          {RECORD_TYPE_CONFIG[type].label}
        </span>
        <span className='ml-auto text-caption font-medium whitespace-nowrap text-fg-secondary'>
          {metric}
        </span>
      </div>
      <span
        className={`text-[28px] leading-[34px] font-bold tracking-[-0.01em] tabular-nums ${
          isEmpty ? 'text-fg-secondary' : 'text-fg-primary'
        }`}
      >
        {value}
      </span>
    </Link>
  );
}
