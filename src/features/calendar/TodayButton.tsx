import { Calendar } from 'lucide-react';
import { formatMonthDayLabel } from '@/shared/date/formatDisplayDate';
import { ICON_STROKE_WIDTH } from '@/shared/ui/icon';

const DAY_OF_MONTH_START = 'YYYY-MM-'.length;
// 달력 아이콘 안에 숫자가 들어가야 해서 일반 아이콘(24px)보다 조금 크게
const TODAY_ICON_SIZE = 28;

type TodayButtonProps = {
  today: string;
  onClick: () => void;
};

// "오늘로" 버튼을 글자 대신 오늘 날짜가 적힌 달력 모양으로 (휴대폰 기본 캘린더 앱과 같은 관례).
// 글자 버튼보다 좁아서 모바일 머리 한 줄에 들어가고, 아이콘만 봐도 오늘이 며칠인지 보인다.
// 숫자는 그림이라 화면 읽기 프로그램에는 aria-label로 "오늘(10월 21일)로"를 알려 준다
export default function TodayButton({ today, onClick }: TodayButtonProps) {
  return (
    <button
      type='button'
      aria-label={`오늘(${formatMonthDayLabel(today)})로`}
      onClick={onClick}
      className='relative inline-flex size-11 shrink-0 items-center justify-center rounded-md text-fg-primary hover:bg-surface-hover active:bg-surface-pressed'
    >
      <Calendar
        aria-hidden='true'
        size={TODAY_ICON_SIZE}
        strokeWidth={ICON_STROKE_WIDTH}
      />
      {/* Calendar 아이콘(28px, 버튼 가운데)의 가로선 아래 빈칸이 버튼 위에서 약 20~34px. 그 가운데에 11px 숫자를 얹는다 */}
      <span
        aria-hidden='true'
        className='absolute inset-x-0 top-[21px] text-center text-[11px] leading-none font-bold tabular-nums'
      >
        {Number(today.slice(DAY_OF_MONTH_START))}
      </span>
    </button>
  );
}
