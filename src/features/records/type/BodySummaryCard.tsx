import BodyCompareLink from '@/features/photos/compare/BodyCompareLink';
import { BODY_MEASURE_LABEL, BODY_MEASURE_UNIT } from '../schema/body';
import type { LatestWeight } from '../hooks/useLatestWeight';
import { formatMeasurement } from '../ui/recordPresentation';
import type { BodySummary } from '../ui/typeSummary';
import MeasureChart from './MeasureChart';

type BodySummaryCardProps = {
  // 전체 기록 중 마지막 체중과 바로 전 체중과의 차이. 체중 기록이 없으면 null
  latestWeight: LatestWeight | null;
  // 이 달의 체중·허리둘레 점
  summary: BodySummary;
};

// 차이 글자: (-0.4kg) / (+0.4kg) / (0kg). 빠진 게 늘 좋은 건 아니라서 색으로 좋고 나쁨을 칠하지 않는다
function formatChange(change: number): string {
  return `(${change > 0 ? '+' : ''}${formatMeasurement(change, 'kg')})`;
}

// 체형 요약 (2026-10-22 사용자 결정으로 다시 정리):
// - "최근 체중 68.4kg(-0.4kg)": 달과 상관없이 마지막 체중, 괄호는 바로 전 체중과의 차이. "이 달 변화" 글자는 두지 않는다
// - 그래프는 체중·허리둘레를 따로, 이 달에 잰 날만으로 (MeasureChart). 그 달에 잰 적 없는 항목은 그래프를 그리지 않는다
export default function BodySummaryCard({
  latestWeight,
  summary,
}: BodySummaryCardProps) {
  return (
    <>
      <div className='flex flex-col gap-1'>
        <span className='text-body-sm text-fg-secondary'>최근 체중</span>
        <span className='text-[28px] leading-[34px] font-bold text-fg-primary tabular-nums'>
          {latestWeight === null
            ? '—'
            : formatMeasurement(latestWeight.weight, 'kg')}
          {latestWeight?.change != null && (
            <span className='ml-1 text-body font-semibold text-fg-secondary'>
              {formatChange(latestWeight.change)}
            </span>
          )}
        </span>
      </div>
      {(['weight', 'waist'] as const).map(
        (measure) =>
          summary.points[measure].length > 0 && (
            <MeasureChart
              key={measure}
              label={BODY_MEASURE_LABEL[measure]}
              unit={BODY_MEASURE_UNIT[measure]}
              points={summary.points[measure]}
            />
          ),
      )}
      {/* 눈바디 비교 입구 (37d): 같은 자세 사진이 2개 날짜 이상일 때(체험 계정은 예시로) 보인다 */}
      <BodyCompareLink label='눈바디 비교' />
    </>
  );
}
