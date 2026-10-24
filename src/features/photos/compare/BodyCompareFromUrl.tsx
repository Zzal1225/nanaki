'use client';

// 'use client' 이유: 자세·날짜(?kind=&from=&to=)를 서버가 아니라 브라우저가 주소에서 읽는다
// (서버가 읽으면 값마다 HTML이 달라져, 서비스 워커가 저장한 한 장으로 열 수 없다. CLAUDE.md)
import { useSearchParams } from 'next/navigation';
import { parseCompareKind } from './bodyCompare';
import BodyCompareScreen from './BodyCompareScreen';

export default function BodyCompareFromUrl() {
  const params = useSearchParams();
  const kind = parseCompareKind(params.get('kind'));
  // key: 자세가 바뀌면 손잡이 위치 등 화면 안 상태를 처음으로
  return (
    <BodyCompareScreen
      key={kind}
      kind={kind}
      fromParam={params.get('from')}
      toParam={params.get('to')}
    />
  );
}
