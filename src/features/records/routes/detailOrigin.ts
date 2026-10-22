import { toCalendarHref } from '@/features/calendar/calendarState';
import {
  hasSearchCondition,
  parseSearchState,
  toSearchHref,
} from '@/features/search/searchState';
import { isDateString } from '@/shared/date/calendar';
import { parseMonthParam } from '@/shared/date/month';
import { RECORD_TYPE_CONFIG, type RecordType } from '../schema/recordTypes';

// 기록 상세에 "어디서 들어왔는지"를 주소에 담고, 상세의 뒤로 버튼이 그곳으로 가게 한다.
// 예전에는 검색 결과가 아니면 늘 기록 탭으로 가서, 기록 탭 → 후기 화면 → 후기 기록 → 뒤로가 후기 화면을 건너뛰었다
// (2026-10-22 사용자 확인). history.back()을 쓰지 않는 이유: 수정 화면을 거쳐 저장하면(replace) 방문 기록에 상세가 두 번 남아
// 뒤로가 같은 상세로 가고, 주소를 공유·새로고침하면 돌아갈 곳이 사라진다.
// 이름이 back인 이유: 검색 조건이 이미 from·to(기간), type(타입 칩)을 쓴다

type SearchParamsReader = Pick<URLSearchParams, 'get' | 'getAll' | 'forEach'>;

const BACK_PARAM = 'back';
const ID_PARAM = 'id';

export type DetailOrigin =
  | { kind: 'records' }
  | { kind: 'search'; href: string }
  | { kind: 'type'; month: string | null }
  | { kind: 'home'; date: string | null };

// 타입 화면(그 달)에서 연 상세에 붙일 조건
export function typeOriginQuery(month: string | null): string {
  const params = new URLSearchParams({ [BACK_PARAM]: 'type' });
  if (month) params.set('month', month);
  return params.toString();
}

// 홈 하루 요약(그 날짜)에서 연 상세에 붙일 조건
export function homeOriginQuery(date: string): string {
  return new URLSearchParams({ [BACK_PARAM]: 'home', date }).toString();
}

// 주소 → 들어온 곳. 틀린 달·날짜는 버린다 (주소는 누구나 고쳐 칠 수 있다)
export function parseDetailOrigin(params: SearchParamsReader): DetailOrigin {
  const back = params.get(BACK_PARAM);
  if (back === 'type') {
    return { kind: 'type', month: parseMonthParam(params.get('month')) };
  }
  if (back === 'home') {
    const date = params.get('date');
    return { kind: 'home', date: isDateString(date) ? date : null };
  }
  const search = parseSearchState(params);
  if (hasSearchCondition(search)) {
    return { kind: 'search', href: toSearchHref(search) };
  }
  return { kind: 'records' };
}

// 상세 → 수정 → (저장·닫기) → 상세로 이어 가도 들어온 곳이 남게, id를 뺀 나머지 조건을 그대로 넘긴다
export function originQueryOf(params: SearchParamsReader): string {
  const kept = new URLSearchParams();
  params.forEach((value, key) => {
    if (key !== ID_PARAM) kept.append(key, value);
  });
  return kept.toString();
}

// 뒤로 버튼이 갈 곳과 화면 읽기 프로그램 이름. 타입 화면은 기록의 타입으로 정한다 (주소에 타입을 따로 싣지 않는다)
export function detailBackTarget(
  origin: DetailOrigin,
  type: RecordType,
): { href: string; label: string } {
  switch (origin.kind) {
    case 'search':
      return { href: origin.href, label: '검색 결과로 돌아가기' };
    case 'type': {
      const path = `/records/type/${type}`;
      return {
        href: origin.month ? `${path}?month=${origin.month}` : path,
        label: `${RECORD_TYPE_CONFIG[type].label} 화면으로 돌아가기`,
      };
    }
    case 'home':
      return {
        href: origin.date ? toCalendarHref(origin.date) : '/',
        label: '홈으로 돌아가기',
      };
    case 'records':
      return { href: '/records', label: '기록 탭으로 돌아가기' };
  }
}
