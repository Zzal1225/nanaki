import { formatMonthLabel } from '@/shared/date/month';
import type { BudgetProgress } from './budgetProgress';

// 예산 화면·가계부 카드의 문구 (시안 13a, 18). 순수 함수로 떼어 경계(넘음·말일·지난 달)를 화면 없이 테스트한다

export function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

// 남은 날 문구. 0일 = 오늘이 말일 ("0일 남음"은 아직 하루가 남았는데 끝난 것처럼 읽힌다)
function daysLeftText(daysLeft: number): string {
  return daysLeft === 0 ? '오늘이 마지막 날' : `${daysLeft}일 남음`;
}

// 가계부 카드: "187,700원 남았어요 · 12일 남음" / 넘으면 "12,300원 넘었어요".
// 지난 달(daysLeft null)은 끝난 달이라 "남겼어요"로, 남은 날은 붙이지 않는다
export function budgetRemainingText(
  progress: Pick<BudgetProgress, 'remaining' | 'daysLeft'>,
): string | null {
  const { remaining, daysLeft } = progress;
  if (remaining === null) return null;
  if (remaining < 0) return `${formatWon(-remaining)} 넘었어요`;
  if (daysLeft === null) return `${formatWon(remaining)} 남겼어요`;
  return `${formatWon(remaining)} 남았어요 · ${daysLeftText(daysLeft)}`;
}

// 예산 화면 전체 예산 카드 오른쪽: "187,700원 남음 · 12일" (시안 18은 카드보다 짧게)
export function budgetRemainingShortText(
  progress: Pick<BudgetProgress, 'remaining' | 'daysLeft'>,
): string | null {
  const { remaining, daysLeft } = progress;
  if (remaining === null) return null;
  const amount =
    remaining < 0
      ? `${formatWon(-remaining)} 초과`
      : `${formatWon(remaining)} 남음`;
  if (daysLeft === null || remaining < 0) return amount;
  return daysLeft === 0 ? `${amount} · 오늘까지` : `${amount} · ${daysLeft}일`;
}

// 분류 초과 뱃지: "6,700원 초과"
export function overAmountText(spent: number, limit: number): string {
  return `${formatWon(spent - limit)} 초과`;
}

// 이어받은 예산 안내. 그 달 줄이 없어 앞 달 값을 보여 주는 중이고, 바꾸면 이 달 줄이 생긴다는 걸 알린다
// (모르고 바꾸면 "9월 예산을 고쳤다"고 생각할 수 있다: 달마다 따로라 9월은 그대로다)
export function inheritedBudgetNotice(
  sourceMonth: string,
  month: string,
  currentMonth: string,
): string {
  return `${formatMonthLabel(sourceMonth, currentMonth)} 예산을 이어받았어요. 바꾸면 ${formatMonthLabel(month, currentMonth)} 예산으로 저장돼요.`;
}

// 막대 길이(%). 넘어도 100에서 멈춘다: 넘은 건 색·아이콘·글자로 알린다
export function barWidthPercent(percent: number): number {
  return Math.min(percent, 100);
}
