'use client';

// 'use client' 이유: 기록 id(?id=)와 들어온 곳(검색 조건·back=)을 주소에서 브라우저가 읽는다 (화면 HTML을 기록마다 같게, recordRoutes 설명)
import { useSearchParams } from 'next/navigation';
import RecordDetail from '../detail/RecordDetail';
import { originQueryOf, parseDetailOrigin } from './detailOrigin';
import { recordIdFromParams } from './recordRoutes';

// /records/view?id=… (&q=… 검색 결과, &back=type·home 타입 화면·홈에서 온 경우 뒤로 버튼이 그곳으로, detailOrigin)
export default function RecordDetailFromUrl() {
  const params = useSearchParams();
  // id가 비면 사본에서 찾지 못해 "기록을 찾을 수 없어요"가 뜬다
  const id = recordIdFromParams(params) ?? '';
  // key: 다른 기록으로 옮겨 가면 화면 상태를 새로 시작한다 (같은 화면에서 ?id=만 바뀐다)
  return (
    <RecordDetail
      key={id}
      id={id}
      origin={parseDetailOrigin(params)}
      originQuery={originQueryOf(params)}
    />
  );
}
