import type { PhotoKind } from '@/features/records/schema/photoKinds';

// 눈바디 자세 맞추기용 점선 실루엣 (시안 19·P6b). 맞춰 자르기(37c1)와 카메라 촬영(37c2)이 같이 쓴다.
// 사람 모양 경로는 시안의 그림을 그대로 쓰고(아이콘이 아니라 일러스트라 Lucide에 없다), 측면은 가로로 좁혀 옆모습에 가깝게 한다
const BODY_PATH =
  'M86 72 L114 72 L116 86 C138 90 150 98 153 116 L166 214 C168 226 154 230 151 218 L138 142 L140 236 L134 418 C133 432 114 432 113 418 L104 268 L96 268 L87 418 C86 432 67 432 66 418 L60 236 L62 142 L49 218 C46 230 32 226 34 214 L47 116 C50 98 62 90 84 86 Z';

// 자세마다 가로 비율 (시안: 측면 0.55). 실루엣이 없는 사진 종류(후기)는 그리지 않는다
const SILHOUETTE_SCALE_X: Partial<Record<PhotoKind, number>> = {
  front: 1,
  side: 0.55,
};

export function hasSilhouette(kind: PhotoKind): boolean {
  return SILHOUETTE_SCALE_X[kind] !== undefined;
}

// 틀 높이의 92%: 머리 위·발 아래에 여백을 조금 둬서 몸 전체가 틀 안에 들어오게 맞추도록
export default function BodySilhouette({ kind }: { kind: PhotoKind }) {
  const scaleX = SILHOUETTE_SCALE_X[kind];
  if (scaleX === undefined) return null;
  return (
    <svg
      aria-hidden='true'
      viewBox='0 0 200 440'
      preserveAspectRatio='xMidYMid meet'
      // 사진이 밝든 어둡든 보이게: 흰 점선 + 어두운 그림자 (테마 색을 쓰면 밝은 사진 위 라이트 테마에서 사라진다)
      className='pointer-events-none absolute inset-x-0 top-[4%] h-[92%] w-full overflow-visible drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]'
    >
      <g transform={`translate(100 0) scale(${scaleX} 1) translate(-100 0)`}>
        <circle
          cx='100'
          cy='42'
          r='26'
          fill='none'
          stroke='white'
          strokeWidth='2'
          strokeDasharray='6 6'
          vectorEffect='non-scaling-stroke'
        />
        <path
          d={BODY_PATH}
          fill='none'
          stroke='white'
          strokeWidth='2'
          strokeDasharray='6 6'
          strokeLinejoin='round'
          vectorEffect='non-scaling-stroke'
        />
      </g>
    </svg>
  );
}
