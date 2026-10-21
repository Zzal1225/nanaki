import { formatMeasurement } from '../ui/recordPresentation';
import type { BodySummary } from '../ui/typeSummary';

type BodySummaryCardProps = {
  monthLabel: string;
  summary: BodySummary;
};

// 그래프 좌표계(viewBox). 실제 크기는 CSS가 정하고(가로 꽉 채움) 비율만 유지된다
const CHART_WIDTH = 300;
const CHART_HEIGHT = 96;
// 맨 위·아래 점과 선이 잘리지 않게 안쪽 여백
const CHART_PADDING = 8;
const POINT_RADIUS = 3;
// 체중이 모두 같으면 세로 범위가 0이라 나눌 수 없다. 이때는 1kg 범위 가운데 그린다
const FLAT_RANGE_KG = 1;

// 변화 글자: -1.2kg / +0.4kg / 변화 없음. 빠진 게 늘 좋은 건 아니라서 색으로 좋고 나쁨을 칠하지 않는다
function formatChange(change: number): string {
  if (change === 0) return '변화 없음';
  return `${change > 0 ? '+' : ''}${formatMeasurement(change, 'kg')}`;
}

// 체형 요약: 이 달 마지막 체중 + 이 달 변화 + 체중 선 그래프 + 마지막 기록의 다른 항목 칩 (시안).
// 그래프는 차트 라이브러리 없이 SVG로 그린다: 선 하나·점 몇 개라 라이브러리(수십 KB)를 들일 이유가 없다
export default function BodySummaryCard({
  monthLabel,
  summary,
}: BodySummaryCardProps) {
  const weights = summary.points.map((point) => point.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || FLAT_RANGE_KG;
  // 같은 체중만 있으면 가운데 줄에, 아니면 최저가 아래·최고가 위
  const center = max === min ? min - FLAT_RANGE_KG / 2 : min;
  const innerWidth = CHART_WIDTH - CHART_PADDING * 2;
  const innerHeight = CHART_HEIGHT - CHART_PADDING * 2;
  const coordinates = summary.points.map((point) => ({
    x:
      CHART_PADDING +
      ((point.day - 1) / Math.max(summary.daysInMonth - 1, 1)) * innerWidth,
    y: CHART_PADDING + (1 - (point.weight - center) / range) * innerHeight,
  }));
  const first = summary.points.at(0);
  const last = summary.points.at(-1);

  return (
    <>
      <div className='flex items-end justify-between'>
        <div className='flex flex-col gap-1'>
          <span className='text-body-sm text-fg-secondary'>
            {monthLabel} 마지막 체중
          </span>
          <span className='text-[28px] leading-[34px] font-bold text-fg-primary tabular-nums'>
            {summary.latestWeight === null
              ? '—'
              : formatMeasurement(summary.latestWeight, 'kg')}
          </span>
        </div>
        {summary.change !== null && (
          <span className='text-body font-semibold text-fg-primary tabular-nums'>
            <span className='font-normal text-fg-secondary'>이 달 </span>
            {formatChange(summary.change)}
          </span>
        )}
      </div>

      {first && last && (
        <div className='flex flex-col gap-1 border-t border-border pt-4'>
          <div className='flex gap-2'>
            {/* 세로축 눈금: 최고·최저 체중 (같으면 하나만) */}
            <div
              aria-hidden='true'
              className='flex flex-col justify-between py-1 text-caption text-fg-secondary tabular-nums'
            >
              <span>{max.toLocaleString('ko-KR')}</span>
              {max !== min && <span>{min.toLocaleString('ko-KR')}</span>}
            </div>
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              className='h-auto min-w-0 flex-1 text-type-body'
              // 그림 대신 한 문장으로 읽어 준다. 점 하나하나는 아래 목록(기록 목록)에 다 있다
              role='img'
              aria-label={`체중 그래프: ${first.day}일 ${formatMeasurement(first.weight, 'kg')}에서 ${last.day}일 ${formatMeasurement(last.weight, 'kg')}`}
            >
              {coordinates.length > 1 && (
                <polyline
                  points={coordinates.map(({ x, y }) => `${x},${y}`).join(' ')}
                  fill='none'
                  stroke='currentColor'
                  strokeWidth={2}
                  strokeLinejoin='round'
                  strokeLinecap='round'
                />
              )}
              {coordinates.map(({ x, y }, index) => (
                <circle
                  key={summary.points[index].day}
                  cx={x}
                  cy={y}
                  r={POINT_RADIUS}
                  fill='currentColor'
                />
              ))}
            </svg>
          </div>
          <div
            aria-hidden='true'
            className='flex justify-between pl-8 text-caption text-fg-secondary tabular-nums'
          >
            <span>1일</span>
            <span>{summary.daysInMonth}일</span>
          </div>
        </div>
      )}

      {summary.latestOthers.length > 0 && (
        <ul
          aria-label='마지막 기록의 다른 항목'
          className='flex flex-wrap gap-2'
        >
          {summary.latestOthers.map((measurement) => (
            <li
              key={measurement.label}
              className='inline-flex h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-body-sm font-medium text-fg-primary'
            >
              {measurement.label}
              <span className='text-fg-secondary tabular-nums'>
                {formatMeasurement(measurement.value, measurement.unit)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
