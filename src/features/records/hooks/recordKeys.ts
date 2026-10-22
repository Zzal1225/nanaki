// 쿼리 키 = 캐시의 이름표. 같은 키를 쓰는 화면은 같은 캐시를 함께 본다.
// 'records'를 맨 앞에 두는 계층 구조라서, ['records']로 무효화하면 그 아래 모든 목록·상세가 한 번에 무효화된다
export const recordKeys = {
  all: ['records'] as const,
  // 기간마다 키가 달라서 10월 목록과 11월 목록이 따로 캐시된다
  list: (from: string, to: string) =>
    [...recordKeys.all, 'list', from, to] as const,
  recent: (limit: number) => [...recordKeys.all, 'recent', limit] as const,
  detail: (id: string) => [...recordKeys.all, 'detail', id] as const,
  ofType: (type: string, from: string, to: string) =>
    [...recordKeys.all, 'type', type, from, to] as const,
  // 검색어·정렬마다 따로 캐시된다. 타입은 키에 넣지 않는다: 받은 결과를 화면에서 거르므로 칩을 바꿔도 같은 캐시
  search: (keyword: string, sort: string) =>
    [...recordKeys.all, 'search', keyword, sort] as const,
  // 'records' 아래라 기록을 쓰거나 지우면 함께 무효화된다 (새 체중을 쓰면 "최근 체중"도 다시 불러온다)
  latestWithField: (type: string, field: string, limit: number) =>
    [...recordKeys.all, 'latest', type, field, limit] as const,
};
