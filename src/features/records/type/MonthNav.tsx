import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { formatMonthLabel, shiftMonth } from '@/shared/date/month';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';

type MonthNavProps = {
  // 이 달을 보는 주소를 만든다 ('2026-09' → '/records/type/expense?month=2026-09')
  hrefOf: (month: string) => string;
  month: string;
  currentMonth: string;
};

const NAV_BUTTON_CLASS =
  'inline-flex size-11 items-center justify-center rounded-md text-fg-secondary';

// ‹ 10월 › (시안). 달을 주소에 두어 새로고침·공유·뒤로 가기에도 같은 달이 열린다 (CLAUDE.md: 남아야 하는 상태는 URL).
// 아직 오지 않은 달로는 가지 않는다: 다음 버튼을 비활성 모양으로
export default function MonthNav({
  hrefOf,
  month,
  currentMonth,
}: MonthNavProps) {
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  // 'YYYY-MM' 글자는 사전순 = 시간순이라 그대로 비교할 수 있다
  const canGoNext = next <= currentMonth;

  return (
    <nav aria-label='달 이동' className='flex items-center'>
      <Link
        href={hrefOf(previous)}
        // 같은 화면 안에서 달만 바꾸므로 방문 기록을 쌓지 않는다. 뒤로 가기는 기록 탭으로
        replace
        aria-label={`${formatMonthLabel(previous, currentMonth)}로`}
        className={`${NAV_BUTTON_CLASS} hover:bg-surface-hover active:bg-surface-pressed`}
      >
        <ChevronLeft
          aria-hidden='true'
          size={ICON_SIZE.md}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </Link>
      <span
        aria-live='polite'
        className='min-w-12 text-center text-body font-semibold text-fg-primary tabular-nums'
      >
        {formatMonthLabel(month, currentMonth)}
      </span>
      {canGoNext ? (
        <Link
          href={hrefOf(next)}
          replace
          aria-label={`${formatMonthLabel(next, currentMonth)}로`}
          className={`${NAV_BUTTON_CLASS} hover:bg-surface-hover active:bg-surface-pressed`}
        >
          <ChevronRight
            aria-hidden='true'
            size={ICON_SIZE.md}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </Link>
      ) : (
        // 자리는 남겨 두어 달 이름이 좌우로 움직이지 않게 한다
        <span
          aria-hidden='true'
          className={`${NAV_BUTTON_CLASS} text-fg-disabled`}
        >
          <ChevronRight size={ICON_SIZE.md} strokeWidth={ICON_STROKE_WIDTH} />
        </span>
      )}
    </nav>
  );
}
