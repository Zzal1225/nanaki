// 예산 화면 주소는 여기서만 만든다 (기록 화면의 recordRoutes와 같은 규칙: 주소 모양이 바뀌어도 한 곳만 고친다).
// 달은 경로가 아니라 ?month=: 서버 HTML이 달마다 같아야 서비스 워커가 저장한 한 장으로 어느 달이든 오프라인에서 연다 (25c-2)

export const BUDGET_PATH = '/budget';

// month가 null이면 이번 달 (화면이 브라우저에서 오늘을 읽어 정한다)
export function budgetHref(month: string | null): string {
  return month ? `${BUDGET_PATH}?month=${month}` : BUDGET_PATH;
}

// 예산 화면의 뒤로 = 그 달 가계부 화면. 들어오는 곳이 가계부 요약 카드 하나뿐이라 들어온 곳을 주소에 따로 싣지 않는다
export function budgetBackHref(month: string): string {
  return `/records/type/expense?month=${month}`;
}
