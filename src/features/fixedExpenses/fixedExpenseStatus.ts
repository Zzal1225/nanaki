import { differenceInCalendarDays } from 'date-fns';
import { toMonthString } from '@/shared/date/month';
import { fromLocalDateString } from '@/shared/date/toLocalDateString';
import { nextDueDate } from './fixedExpenseDates';
import type { FixedExpense } from './schema/fixedExpense';

// 목록 한 줄의 상태 (시안 18: "매달 5일 · ✓ 기록됨", "매달 20일 · 1일 남음"). 순수 함수라 날짜 경계를 화면 없이 테스트한다
export type FixedExpenseStatus =
  | { kind: 'recorded' }
  | { kind: 'today' }
  | { kind: 'upcoming'; daysLeft: number };

type StatusInput = Pick<FixedExpense, 'schedule' | 'lastRecordedOn'>;

export function getFixedExpenseStatus(
  item: StatusInput,
  today: string,
): FixedExpenseStatus {
  // 이번 달에 이미 기록했으면 (서버 자동 기록이든 추가할 때 "이번 달도"든) 다음 결제일보다 이 사실이 먼저다
  if (
    item.lastRecordedOn !== null &&
    toMonthString(item.lastRecordedOn) === toMonthString(today)
  ) {
    return { kind: 'recorded' };
  }
  const next = nextDueDate(item.schedule.day, today, item.lastRecordedOn);
  // 날짜 글자를 로컬 날짜로 읽어 달력 날 수로 뺀다 (Date의 시각 차이로 나누면 서머타임·시간대에서 하루가 어긋난다)
  const daysLeft = differenceInCalendarDays(
    fromLocalDateString(next),
    fromLocalDateString(today),
  );
  return daysLeft === 0 ? { kind: 'today' } : { kind: 'upcoming', daysLeft };
}

export function formatFixedExpenseStatus(status: FixedExpenseStatus): string {
  switch (status.kind) {
    case 'recorded':
      return '기록됨';
    case 'today':
      // 서버가 매시간 기록하므로 "오늘 안에"라는 뜻으로 쓴다
      return '오늘 기록돼요';
    case 'upcoming':
      return `${status.daysLeft}일 남음`;
  }
}

// 이번 달 고정지출 합계 (시안 18 아래 안내 "이번 달 고정지출 -170,500원"). 규칙이 매달이라 모두 더한다
export function sumFixedExpenses(
  items: readonly Pick<FixedExpense, 'amount'>[],
): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}
