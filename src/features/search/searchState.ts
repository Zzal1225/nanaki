import type { SearchSort } from '@/features/records/api/recordStore';
import { MAX_SEARCH_KEYWORD_LENGTH } from '@/features/records/api/searchQuery';
import {
  parseRecordType,
  type RecordType,
} from '@/features/records/schema/recordTypes';

// 검색 화면의 상태는 모두 주소에 둔다 (CLAUDE.md: 검색어·필터는 공유·새로고침·뒤로 가기에 살아남아야 한다).
// /records/search?q=카페&type=expense&sort=oldest
export type SearchState = {
  keyword: string;
  // null = 전체
  type: RecordType | null;
  sort: SearchSort;
};

export const EMPTY_SEARCH_STATE: SearchState = {
  keyword: '',
  type: null,
  sort: 'latest',
};

// 상세 화면 주소에도 실리는 이름들. 검색 결과에서 연 기록은 /records/[id]?q=카페 처럼 검색 조건을 달고 가서,
// PC 왼쪽 목록이 검색 결과를 계속 보여 준다 (RecordsSidePanel)
const PARAM = { keyword: 'q', type: 'type', sort: 'sort' } as const;

// 주소 값은 누구나 고쳐 칠 수 있다. 모르는 값은 기본값으로 (화면이 깨지지 않게).
// get만 받는다: Next의 useSearchParams(읽기 전용)와 URLSearchParams를 둘 다 넘길 수 있게
export function parseSearchState(
  params: Pick<URLSearchParams, 'get'>,
): SearchState {
  const keyword = (params.get(PARAM.keyword) ?? '')
    .trim()
    .slice(0, MAX_SEARCH_KEYWORD_LENGTH);
  return {
    keyword,
    type: parseRecordType(params.get(PARAM.type)),
    sort: params.get(PARAM.sort) === 'oldest' ? 'oldest' : 'latest',
  };
}

// 기본값은 주소에 쓰지 않는다: 주소가 짧고, 같은 상태는 언제나 같은 주소라 캐시·비교가 쉽다
export function toSearchParams(state: SearchState): string {
  const params = new URLSearchParams();
  if (state.keyword) params.set(PARAM.keyword, state.keyword);
  if (state.type) params.set(PARAM.type, state.type);
  if (state.sort !== 'latest') params.set(PARAM.sort, state.sort);
  return params.toString();
}

export function toSearchHref(state: SearchState): string {
  const query = toSearchParams(state);
  return query ? `/records/search?${query}` : '/records/search';
}

// 조회할 조건이 있는지. 정렬만 바꾼 상태는 조건이 아니다 (아무것도 안 친 첫 화면은 안내만 보여 준다)
export function hasSearchCondition(state: SearchState): boolean {
  return state.keyword !== '' || state.type !== null;
}
