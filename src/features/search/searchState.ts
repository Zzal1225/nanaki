import type { SearchSort } from '@/features/records/api/recordStore';
import { MAX_SEARCH_KEYWORD_LENGTH } from '@/features/records/api/searchQuery';
import {
  parseRecordType,
  type RecordType,
} from '@/features/records/schema/recordTypes';
import {
  parseFieldFilters,
  parsePeriod,
  writeFieldFilters,
  writePeriod,
  type FieldFilters,
  type PeriodFilter,
} from './searchFilters';

// 검색 화면의 상태는 모두 주소에 둔다 (CLAUDE.md: 검색어·필터는 공유·새로고침·뒤로 가기에 살아남아야 한다).
// /records/search?q=카페&type=expense&sort=oldest&period=month&category=카페&amount_min=3000
export type SearchState = {
  keyword: string;
  // null = 전체
  type: RecordType | null;
  sort: SearchSort;
  period: PeriodFilter | null;
  // 고른 타입의 칸 필터 (타입이 없으면 늘 비어 있다)
  fields: FieldFilters;
};

export const EMPTY_SEARCH_STATE: SearchState = {
  keyword: '',
  type: null,
  sort: 'latest',
  period: null,
  fields: {},
};

// 상세 화면 주소에도 실리는 이름들. 검색 결과에서 연 기록은 /records/[id]?q=카페 처럼 검색 조건을 달고 가서,
// PC 왼쪽 목록이 검색 결과를 계속 보여 준다 (RecordsSidePanel)
const PARAM = { keyword: 'q', type: 'type', sort: 'sort' } as const;

// 주소에서 읽는 데 필요한 것만 받는다: Next의 useSearchParams(읽기 전용)와 URLSearchParams를 둘 다 넘길 수 있게
export type SearchParamsReader = Pick<URLSearchParams, 'get' | 'getAll'>;

// 주소 값은 누구나 고쳐 칠 수 있다. 모르는 값은 기본값으로 (화면이 깨지지 않게)
export function parseSearchState(params: SearchParamsReader): SearchState {
  const keyword = (params.get(PARAM.keyword) ?? '')
    .trim()
    .slice(0, MAX_SEARCH_KEYWORD_LENGTH);
  const type = parseRecordType(params.get(PARAM.type));
  return {
    keyword,
    type,
    sort: params.get(PARAM.sort) === 'oldest' ? 'oldest' : 'latest',
    period: parsePeriod(params),
    fields: parseFieldFilters(params, type),
  };
}

// 기본값은 주소에 쓰지 않는다: 주소가 짧고, 같은 상태는 언제나 같은 주소라 캐시·비교가 쉽다
export function toSearchParams(state: SearchState): string {
  const params = new URLSearchParams();
  if (state.keyword) params.set(PARAM.keyword, state.keyword);
  if (state.type) params.set(PARAM.type, state.type);
  if (state.sort !== 'latest') params.set(PARAM.sort, state.sort);
  writePeriod(params, state.period);
  // 타입 없이 칸 필터만 있는 상태는 만들지 않는다 (칸 이름이 타입마다 다르다)
  if (state.type) writeFieldFilters(params, state.fields);
  return params.toString();
}

export function toSearchHref(state: SearchState): string {
  const query = toSearchParams(state);
  return query ? `/records/search?${query}` : '/records/search';
}

// 조회할 조건이 있는지. 정렬만 바꾼 상태는 조건이 아니다 (아무것도 안 친 첫 화면은 안내만 보여 준다).
// 칸 필터는 타입이 있어야 생기므로 타입만 보면 된다
export function hasSearchCondition(state: SearchState): boolean {
  return state.keyword !== '' || state.type !== null || state.period !== null;
}

// 검색창 안내 문구 (기록 탭 검색창 모양 링크와 검색 화면 입력칸이 같이 쓴다).
// 찾는 칸은 records/api/searchQuery(matchesKeyword). 그 칸을 바꾸면 이 문구도 맞춘다
export const SEARCH_PLACEHOLDER = '제목, 메모, 태그, 분류로 검색';
