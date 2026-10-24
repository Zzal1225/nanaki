'use client';

// 'use client' 이유: 기간·타입(?from=&to=&types=)을 서버가 아니라 브라우저가 주소에서 읽는다
// (서버 HTML을 조건마다 같게 → 오프라인에서도 저장본 한 장으로 연다, CLAUDE.md 모바일·PC 분기)
import { useSearchParams } from 'next/navigation';
import { parseReportQuery } from '../reportModel';
import ReportSetup from './ReportSetup';
import ReportView from './ReportView';

// 조건이 온전하면 결과, 아니면(처음 들어옴·틀린 주소) 고르는 화면. 틀린 주소를 다른 주소로 옮기지 않는 이유:
// 같은 /report 안이라 고르는 화면을 보여 주는 것으로 충분하고, 주소를 바꾸면 뒤로 가기에 한 칸이 더 생긴다
export default function ReportFromUrl() {
  const params = useSearchParams();
  const query = parseReportQuery({
    from: params.get('from'),
    to: params.get('to'),
    types: params.get('types'),
  });
  return query ? <ReportView query={query} /> : <ReportSetup />;
}
