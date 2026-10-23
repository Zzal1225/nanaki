import { budgetSchema, type Budget } from '../schema/budget';

// 편집 시트의 입력값 → 저장할 예산. 순수 함수로 떼어 빈 칸·잘못된 값 처리를 화면 없이 테스트한다

// 금액 한 칸 규칙 (전체 예산의 규칙에서 null 허용만 벗긴 것 = 지출 금액과 같은 규칙). 스키마를 다시 쓰지 않고 꺼내 쓴다
const amountSchema = budgetSchema.shape.total.unwrap();

export const SAVE_FAILED_MESSAGE =
  '저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.';

type DraftResult<T> = { ok: true; budget: Budget } | { ok: false; errors: T };

// 전체 예산: 빈 칸 = 전체 예산 없음(null). 0은 빈 칸과 다르다: "0원 예산"은 뜻이 없어 오류로 알린다
export function applyTotalDraft(
  budget: Budget,
  total: number | undefined,
): DraftResult<string> {
  if (total === undefined)
    return { ok: true, budget: { ...budget, total: null } };
  const result = amountSchema.safeParse(total);
  if (!result.success)
    return { ok: false, errors: result.error.issues[0].message };
  return { ok: true, budget: { ...budget, total: result.data } };
}

// 분류별 예산: 빈 칸은 그 분류 예산 없음(목록에서 뺀다). 칸마다 오류를 따로 돌려준다
export function applyCategoriesDraft(
  budget: Budget,
  amounts: Readonly<Record<string, number | undefined>>,
): DraftResult<Record<string, string>> {
  const categories: Record<string, number> = {};
  const errors: Record<string, string> = {};
  for (const [name, amount] of Object.entries(amounts)) {
    if (amount === undefined) continue;
    const result = amountSchema.safeParse(amount);
    if (result.success) categories[name] = result.data;
    else errors[name] = result.error.issues[0].message;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, budget: { ...budget, categories } };
}
