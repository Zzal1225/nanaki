import type { CompareKind } from './bodyCompare';

// 체험 계정용 예시 몸 그림 (시안 20b: "체험용 예시 이미지"). 체험 계정에는 사진이 없어서, 폭이 다른 실루엣 둘로 비교 슬라이더의 동작만 보여 준다.
// 파일을 올리지 않는 이유 (2026-10-24 사용자 결정): 체험 계정마다 사진을 저장하면 저장 공간과 3일 뒤 정리(파일 지우기)가 늘어난다.
// 모양은 점선 실루엣(BodySilhouette)과 같은 경로를 채워서 그린다. 측면은 가로로 좁혀 옆모습에 가깝게
const BODY_PATH =
  'M86 72 L114 72 L116 86 C138 90 150 98 153 116 L166 214 C168 226 154 230 151 218 L138 142 L140 236 L134 418 C133 432 114 432 113 418 L104 268 L96 268 L87 418 C86 432 67 432 66 418 L60 236 L62 142 L49 218 C46 230 32 226 34 214 L47 116 C50 98 62 90 84 86 Z';

const SIDE_SCALE_X = 0.55;

export default function DemoBody({
  kind,
  widthScale,
}: {
  kind: CompareKind;
  // 앞 날짜는 조금 넓게(1.14, 시안) 그려 손잡이를 움직이면 차이가 보이게
  widthScale: number;
}) {
  const scaleX = widthScale * (kind === 'side' ? SIDE_SCALE_X : 1);
  return (
    <div className='flex size-full items-center justify-center bg-type-body-subtle'>
      <svg
        aria-hidden='true'
        viewBox='0 0 200 440'
        className='h-[90%] w-full overflow-visible'
      >
        <g transform={`translate(100 0) scale(${scaleX} 1) translate(-100 0)`}>
          <circle
            cx='100'
            cy='42'
            r='26'
            className='fill-surface stroke-type-body'
            strokeWidth='2'
            vectorEffect='non-scaling-stroke'
          />
          <path
            d={BODY_PATH}
            className='fill-surface stroke-type-body'
            strokeWidth='2'
            strokeLinejoin='round'
            vectorEffect='non-scaling-stroke'
          />
        </g>
      </svg>
    </div>
  );
}
