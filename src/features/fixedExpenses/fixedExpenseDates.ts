import {
  getMonthRangeOf,
  shiftMonth,
  toMonthString,
} from '@/shared/date/month';

// 고정지출의 결제일 계산 (순수 함수). DB 함수 record_due_fixed_expenses와 같은 규칙이어야 한다:
// 화면의 "기록됨 / N일 남음"(fixedExpenseStatus)이 이걸로 판단한다

const DATE_DAY_LENGTH = 2;

// 그 달의 결제일 'YYYY-MM-DD'. 31일 규칙은 30일까지 있는 달에 30일 (Schedule의 "없는 날은 말일"과 같다)
export function dueDateInMonth(day: number, month: string): string {
  const lastDay = Number(getMonthRangeOf(month).to.slice(-DATE_DAY_LENGTH));
  const dueDay = Math.min(day, lastDay);
  return `${month}-${String(dueDay).padStart(DATE_DAY_LENGTH, '0')}`;
}

// 다음에 기록될 결제일 (오늘 포함). 이번 달 것이 이미 기록됐거나 지났으면 다음 달
export function nextDueDate(
  day: number,
  today: string,
  lastRecordedOn: string | null,
): string {
  const month = toMonthString(today);
  const thisMonth = dueDateInMonth(day, month);
  const isRecordedThisMonth =
    lastRecordedOn !== null && toMonthString(lastRecordedOn) === month;
  if (thisMonth >= today && !isRecordedThisMonth) return thisMonth;
  return dueDateInMonth(day, shiftMonth(month, 1));
}
