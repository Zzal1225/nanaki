import { formatMinutes } from '../ui/recordPresentation';
import type { WorkoutSummary } from '../ui/typeSummary';

type WorkoutSummaryCardProps = {
  monthLabel: string;
  summary: WorkoutSummary;
};

// 막대 영역 높이(px). 가장 긴 주가 이 높이를 채우고 나머지는 비율대로
const BAR_AREA_HEIGHT = 80;
// 0분인 주도 바닥에 얇게 보여서 "이 주가 비었다"는 걸 알 수 있게 (시안 4px)
const EMPTY_BAR_HEIGHT = 4;

// 운동 요약: 이 달 횟수 + 총 시간 + 주별 시간 막대 (시안 "운동 · 주별 시간").
// 막대 색은 운동 색 하나, 비교는 높이로만 (가계부 분류 막대와 같은 규칙)
export default function WorkoutSummaryCard({
  monthLabel,
  summary,
}: WorkoutSummaryCardProps) {
  // 모든 주가 0분이면 나누지 않는다 (0으로 나누면 NaN 높이)
  const maxMinutes = Math.max(...summary.weeks.map((week) => week.minutes));

  return (
    <>
      <div className='flex items-end justify-between'>
        <div className='flex flex-col gap-1'>
          <span className='text-body-sm text-fg-secondary'>
            {monthLabel} 운동
          </span>
          <span className='text-[28px] leading-[34px] font-bold text-fg-primary tabular-nums'>
            {summary.count}회
          </span>
        </div>
        <span className='text-body font-semibold text-fg-primary tabular-nums'>
          <span className='font-normal text-fg-secondary'>총 </span>
          {formatMinutes(summary.totalMinutes)}
        </span>
      </div>
      <div className='flex flex-col gap-2 border-t border-border pt-4'>
        <h2 className='text-body-sm font-semibold text-fg-primary'>
          주별 시간
        </h2>
        <ul className='flex items-end gap-2'>
          {summary.weeks.map((week, index) => (
            <li
              key={week.firstDay}
              className='flex min-w-0 flex-1 flex-col items-center gap-1 text-caption tabular-nums'
            >
              <span
                className={
                  week.minutes === 0 ? 'text-fg-disabled' : 'text-fg-primary'
                }
              >
                {week.minutes === 0 ? '—' : formatMinutes(week.minutes)}
              </span>
              {/* 막대는 장식. 같은 정보가 위의 분 글자로 있어서 스크린 리더에는 숨긴다 */}
              <span
                aria-hidden='true'
                className='flex w-full items-end justify-center'
                style={{ height: BAR_AREA_HEIGHT }}
              >
                <span
                  className={`block w-full max-w-8 rounded-sm ${
                    week.minutes === 0
                      ? 'bg-surface-pressed'
                      : 'bg-type-workout'
                  }`}
                  // 높이는 데이터마다 달라서 클래스가 아니라 style로 (Tailwind는 미리 모르는 값을 만들 수 없다)
                  style={{
                    height:
                      week.minutes === 0
                        ? EMPTY_BAR_HEIGHT
                        : Math.max(
                            EMPTY_BAR_HEIGHT,
                            Math.round(
                              (week.minutes / maxMinutes) * BAR_AREA_HEIGHT,
                            ),
                          ),
                  }}
                />
              </span>
              <span className='text-fg-secondary'>
                {index + 1}주
                {/* 화면에는 "1주"만, 화면 읽기 프로그램에는 어느 날짜인지까지 */}
                <span className='sr-only'>
                  {' '}
                  ({week.firstDay}~{week.lastDay}일)
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
