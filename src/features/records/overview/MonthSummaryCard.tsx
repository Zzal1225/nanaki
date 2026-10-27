import Link from 'next/link';
import { ICON_STROKE_WIDTH, ICON_SIZE } from '@/shared/ui/icon';
import { RECORD_TYPE_CONFIG, type RecordType } from '../schema/recordTypes';
import type { PreviousMonthComparison } from '../ui/recordPresentation';
import { RECORD_TYPE_STYLE } from '../ui/recordTypeStyle';

// 불러오는 중 값 자리에 보이는 글자. 숫자처럼 보이지 않게 줄표 하나
const LOADING_VALUE = '—';

type MonthSummaryCardProps = {
  type: RecordType;
  // null = 아직 불러오는 중. 카드 틀(아이콘·이름)은 그대로 그리고 값 자리만 흐리게 둔다
  value: string | null;
  // "지난달보다 12,000원 덜 썼어요"의 조각. 비교할 지난달 기록이 없으면 null → 줄을 그리지 않는다
  comparison: PreviousMonthComparison | null;
  // 기록이 없을 때는 값을 흐린 색으로 (시안 빈 상태: "어떤 숫자가 쌓일지 미리 보여준다")
  isEmpty: boolean;
  // 그리드 한 줄을 다 차지할지 (첫 카드, 홀수 개일 때 마지막 카드)
  isWide: boolean;
  // 누르면 그 타입의 이번 달 상세로
  href: string;
};

// 표시만 한다. 값 계산은 부르는 쪽(RecordsOverview)과 recordPresentation이 맡는다. 카드 전체가 타입 상세로 가는 링크.
// 카드 안 꼬리표("이번 달 지출")와 카드 위 제목("10월 요약")은 두지 않는다 (2026-10-22 사용자 결정).
// 꼬리표 자리에는 지난달과의 비교 한 줄을 둔다
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
      {/* 불러오는 중에도 같은 span을 그려 두고 글자만 바꾼다 (2026-10-27, Lighthouse 3단계).
          예전에는 회색 상자만 그렸다가 데이터가 오면 이 큰 숫자를 처음 그려서, 그 순간(데이터 도착)이 LCP였다.
          Chrome은 이미 그린 글자 요소의 내용이 바뀌는 것은 LCP로 다시 세지 않아, LCP가 화면 틀이 그려진 때로 정해진다.
          감수한 것: 첫 방문에 금액이 보이는 실제 시각은 같다(데이터를 기다린다). 다시 방문은 기기 사본에서 바로 읽는다 */}
      <span
        className={`text-[28px] leading-[34px] font-bold tracking-[-0.01em] tabular-nums ${
          value === null
            ? 'animate-pulse text-fg-disabled'
            : isEmpty
              ? 'text-fg-secondary'
              : 'text-fg-primary'
        }`}
      >
        {value ?? LOADING_VALUE}
      </span>
      {comparison && (
        // 반 폭 카드에서는 두 줄로 넘어간다. 단어 중간에서 끊기지 않게(전역 keep-all) 자연스럽게 줄바꿈.
        // 수치(12,000원·2건·2회·1.2kg)만 굵게: 문장보다 숫자가 먼저 눈에 들어오게 (2026-10-22 사용자 결정)
        <span className='text-caption text-pretty text-fg-secondary'>
          {comparison.kind === 'same' ? (
            '지난달과 같아요'
          ) : (
            <>
              지난달보다{' '}
              <strong className='font-bold text-fg-primary'>
                {comparison.amount}
              </strong>{' '}
              {comparison.word}
            </>
          )}
        </span>
      )}
    </Link>
  );
}
