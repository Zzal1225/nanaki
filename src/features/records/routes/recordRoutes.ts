import { parseRecordType, type RecordType } from '../schema/recordTypes';

// 기록 화면 주소를 만들고 읽는 곳 (25c-2). 주소 모양은 여기에만 둔다.
//
// 상세·수정은 기록 id를 경로가 아니라 ?id=로 싣는다 (2026-10-22 사용자 결정: /records/<id> → /records/view?id=<id>).
// 이유: 화면 HTML이 기록과 상관없이 한 장(정적 ○)이어야 서비스 워커가 저장해 둔 그 한 장으로
// 연 적 없는 기록도 오프라인에서 연다. 경로에 id가 있으면 Next가 HTML 안에 "그린 경로 값"을 남겨서,
// 다른 기록에 같은 HTML을 쓰면 화면이 불러오는 중에 멈췄다 (25c-2 E2E로 확인). ?뒤는 HTML에 들어가지 않는다.
// 예전 주소(/records/<id>, /records/<id>/edit)는 next.config.ts의 redirects가 새 주소로 넘긴다

export const RECORD_VIEW_PATH = '/records/view';
export const RECORD_EDIT_PATH = '/records/edit';
const ID_PARAM = 'id';

// 상세 주소. extraQuery는 함께 실을 조건 (검색 결과에서 연 상세: q=카페 → 뒤로 가기·PC 왼쪽 결과 유지)
export function recordViewHref(id: string, extraQuery = ''): string {
  const params = new URLSearchParams(extraQuery);
  params.set(ID_PARAM, id);
  return `${RECORD_VIEW_PATH}?${params.toString()}`;
}

// 수정 주소. extraQuery는 상세가 들고 온 "들어온 곳"(detailOrigin): 저장·닫기 뒤 상세로 돌아와도 뒤로 버튼이 그곳으로 간다
export function recordEditHref(id: string, extraQuery = ''): string {
  const params = new URLSearchParams(extraQuery);
  params.set(ID_PARAM, id);
  return `${RECORD_EDIT_PATH}?${params.toString()}`;
}

// 지금 화면이 상세·수정이면 그 기록 id (PC 목록에서 "열려 있는 기록" 표시). 아니면 null
export function openRecordId(
  pathname: string | null,
  params: Pick<URLSearchParams, 'get'> | null,
): string | null {
  if (pathname !== RECORD_VIEW_PATH && pathname !== RECORD_EDIT_PATH) {
    return null;
  }
  return params?.get(ID_PARAM) || null;
}

// 주소의 id (상세·수정 화면이 읽는다). 비었으면 null
export function recordIdFromParams(
  params: Pick<URLSearchParams, 'get'>,
): string | null {
  return params.get(ID_PARAM) || null;
}

// 타입 상세 /records/type/<type> 의 타입. 모르는 타입이면 null
export function recordTypeFromPath(pathname: string): RecordType | null {
  const match = /^\/records\/type\/([^/]+)$/.exec(pathname);
  return match ? parseRecordType(match[1]) : null;
}
