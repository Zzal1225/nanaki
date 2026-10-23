import {
  getMonthRangeOf,
  shiftMonth,
  toMonthString,
} from '@/shared/date/month';

// 고정지출의 결제일 계산 (순수 함수). DB 함수 record_due_fixed_expenses와 같은 규칙이어야 한다:
// 화면이 "기록됨 / N일 남음"(33d)과 "이번 달 결제일이 지났나"(추가할 때 묻기)를 이걸로 판단한다

const DATE_DAY_LENGTH = 2;

// 그 달의 결제일 'YYYY-MM-DD'. 31일 규칙은 30일까지 있는 달에 30일 (Schedule의 "없는 날은 말일"과 같다)
export function dueDateInMonth(day: number, month: string): string {
  const lastDay = Number(getMonthRangeOf(month).to.slice(-DATE_DAY_LENGTH));
  const dueDay = Math.min(day, lastDay);
  return `${month}-${String(dueDay).padStart(DATE_DAY_LENGTH, '0')}`;
}

// 이번 달 결제일이 오늘보다 앞인가. 이때만 추가하면서 "이번 달 지출도 기록하기"를 묻는다 (2026-10-23 사용자 결정).
// 오늘이 결제일이면 지난 것이 아니다: 서버가 그날 안에 기록한다
export function isDueDatePassed(day: number, today: string): boolean {
  return dueDateInMonth(day, toMonthString(today)) < today;
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

// '2026-10-05' → '10월 5일' (추가 시트의 "이번 달 지출도 기록하기 (10월 5일)"). 요일은 붙이지 않는다: 선택지 글자를 짧게
export function formatMonthDay(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${month}월 ${day}일`;
}
