import { formatMeasurement } from '../ui/recordPresentation';
import type { MeasurePoint } from '../ui/typeSummary';

type MeasureChartProps = {
  // "체중" / "허리둘레"
  label: string;
  unit: string;
  points: MeasurePoint[];
};

// 그래프 좌표계(viewBox). 실제 크기는 CSS가 정하고(가로 꽉 채움) 비율만 유지된다
const CHART_WIDTH = 300;
const CHART_HEIGHT = 80;
// 맨 위·아래 점과 선이 잘리지 않게 안쪽 여백
const CHART_PADDING = 8;
const POINT_RADIUS = 3;
// 값이 모두 같으면 세로 범위가 0이라 나눌 수 없다. 이때는 가운데 줄에 그린다
const FLAT_POSITION = 0.5;

// '2026-10-19' → '10.19' (축 끝의 짧은 날짜)
function toShortDate(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${month}.${day}`;
}

// 체형 측정값 하나(체중 또는 허리둘레)의 선 그래프.
// 가로축은 달력 날짜(1~31일)가 아니라 "잰 순서"로 고르게 놓는다 (2026-10-22 사용자 결정: 실제 데이터가 있는 기준).
// 그래서 점 사이 간격은 날짜 차이를 뜻하지 않는다. 축 양 끝에 첫·마지막 잰 날을 적어 기간을 알린다.
// 차트 라이브러리 없이 SVG로: 선 하나·점 몇 개라 라이브러리(수십 KB)를 들일 이유가 없다
export default function MeasureChart({
  label,
  unit,
  points,
}: MeasureChartProps) {
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const innerWidth = CHART_WIDTH - CHART_PADDING * 2;
  const innerHeight = CHART_HEIGHT - CHART_PADDING * 2;
  const coordinates = points.map((point, index) => ({
    // 점이 하나면 가운데
    x:
      CHART_PADDING +
      (points.length === 1 ? 0.5 : index / (points.length - 1)) * innerWidth,
    // SVG의 y는 아래로 커진다 → 큰 값이 위로 가게 1에서 뺀다
    y:
      CHART_PADDING +
      (max === min ? FLAT_POSITION : 1 - (point.value - min) / (max - min)) *
        innerHeight,
  }));
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <div className='flex flex-col gap-1 border-t border-border pt-4'>
      <h2 className='text-body-sm font-semibold text-fg-primary'>{label}</h2>
      <div className='flex gap-2'>
        {/* 세로축 눈금: 최고·최저 (같으면 하나만) */}
        <div
          aria-hidden='true'
          className='flex w-9 shrink-0 flex-col justify-between py-1 text-caption text-fg-secondary tabular-nums'
        >
          <span>{max.toLocaleString('ko-KR')}</span>
          {max !== min && <span>{min.toLocaleString('ko-KR')}</span>}
        </div>
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className='h-auto min-w-0 flex-1 text-type-body'
          // 그림 대신 한 문장으로 읽어 준다. 점 하나하나는 아래 기록 목록에 다 있다
          role='img'
          aria-label={`${label} 그래프: ${toShortDate(first.date)} ${formatMeasurement(first.value, unit)}에서 ${toShortDate(last.date)} ${formatMeasurement(last.value, unit)}`}
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
              key={points[index].date}
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
        className='flex justify-between pl-11 text-caption text-fg-secondary tabular-nums'
      >
        <span>{toShortDate(first.date)}</span>
        {points.length > 1 && <span>{toShortDate(last.date)}</span>}
      </div>
    </div>
  );
}
