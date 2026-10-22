import { parseRecordType, type RecordType } from '../schema/recordTypes';

// 기록 화면 주소에서 값을 꺼내는 순수 함수 (25c-2).
// 상세·수정·타입 화면은 주소의 값을 서버가 아니라 브라우저에서 읽는다:
// 서버 HTML이 주소 값과 상관없이 같아야 서비스 워커가 저장해 둔 한 장(틀)을 다른 기록에도 내줄 수 있다 → 연 적 없는 기록도 오프라인에서 열린다.
// useParams 대신 주소(pathname)를 읽는 이유: 틀로 쓴 HTML의 params는 "그 틀을 받은 기록"의 값이라 다르다. 주소창은 지금 기록이다

// 상세 /records/<id>, 수정 /records/<id>/edit 의 id. 다른 모양이면 null
const RECORD_PATH = /^\/records\/([^/]+)(?:\/edit)?$/;
// 기록 화면이 아닌 /records/<이름> (같은 자리를 쓰는 다른 화면)
const NOT_RECORD_IDS = new Set(['new', 'search', 'type']);

export function recordIdFromPath(pathname: string): string | null {
  const id = RECORD_PATH.exec(pathname)?.[1];
  if (!id || NOT_RECORD_IDS.has(id)) return null;
  return decodeURIComponent(id);
}

// 타입 상세 /records/type/<type> 의 타입. 모르는 타입이면 null
export function recordTypeFromPath(pathname: string): RecordType | null {
  const match = /^\/records\/type\/([^/]+)$/.exec(pathname);
  return match ? parseRecordType(match[1]) : null;
}
