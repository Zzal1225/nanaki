import Link from 'next/link';
import { ICON_STROKE_WIDTH, ICON_SIZE } from '@/shared/ui/icon';
import { RECORD_TYPE_CONFIG, type RecordType } from '../schema/recordTypes';
import { RECORD_TYPE_STYLE } from '../ui/recordTypeStyle';

type MonthSummaryCardProps = {
  type: RecordType;
  value: string;
  // "지난달 같은 기간보다 12,000원 덜 썼어요". 비교할 지난달 기록이 없으면 null → 줄을 그리지 않는다
  comparison: string | null;
  // 기록이 없을 때는 값을 흐린 색으로 (시안 빈 상태: "어떤 숫자가 쌓일지 미리 보여준다")
  isEmpty: boolean;
  // 그리드 한 줄을 다 차지할지 (첫 카드, 홀수 개일 때 마지막 카드)
  isWide: boolean;
  // 누르면 그 타입의 이번 달 상세로
  href: string;
};

// 표시만 한다. 값 계산은 부르는 쪽(RecordsOverview)과 recordPresentation이 맡는다. 카드 전체가 타입 상세로 가는 링크.
// 카드 안 꼬리표("이번 달 지출")는 없앴다 (2026-10-22 사용자 결정): 카드 위 제목 "10월 요약"이 기간을 알려 주고,
// 그 자리에 지난달 같은 기간과의 비교를 둔다
export default function MonthSummaryCard({
  type,
  value,
  comparison,
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
      </div>
      <span
        className={`text-[28px] leading-[34px] font-bold tracking-[-0.01em] tabular-nums ${
          isEmpty ? 'text-fg-secondary' : 'text-fg-primary'
        }`}
      >
        {value}
      </span>
      {comparison && (
        // 반 폭 카드에서는 두 줄로 넘어간다. 단어 중간에서 끊기지 않게(전역 keep-all) 자연스럽게 줄바꿈
        <span className='text-caption text-pretty text-fg-secondary'>
          {comparison}
        </span>
      )}
    </Link>
  );
}
