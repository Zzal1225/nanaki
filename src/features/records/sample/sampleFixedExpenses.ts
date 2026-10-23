import type { FixedExpenseInput } from '@/features/fixedExpenses/schema/fixedExpense';

// 체험하기 예시 고정지출 2개 (2026-10-23 사용자 결정: 체험하는 사람이 빈 목록이 아니라 기능을 바로 본다).
// 결제일은 오늘 기준으로 정하고 오늘과 겹치지 않게 한다: 오늘이 결제일이면 서버 예약 작업(매시간)이 체험 계정에도
// 오늘 가계부 기록을 하나 더 만들어, 예시 기록 수가 그날만 달라진다 (CI의 로컬 DB에서도 pg_cron이 돌아 E2E가 그날만 깨진다).
// 1~28일 안에서 고른다: 29~31일은 달마다 말일로 바뀌어 "며칠 남음"이 달에 따라 흔들린다
const DAYS_IN_SAFE_MONTH = 28;
// 곧 다가오는 결제일과 이미 지난(다음 달) 결제일을 하나씩: 목록에 "N일 남음"이 서로 다르게 보이게
const SOON_OFFSET = 5;
const LATER_OFFSET = 15;

function dayAfter(todayDay: number, offset: number): number {
  return ((todayDay - 1 + offset) % DAYS_IN_SAFE_MONTH) + 1;
}

export function buildSampleFixedExpenses(today: string): FixedExpenseInput[] {
  const todayDay = Number(today.slice(-2));
  return [
    {
      name: '통신비',
      amount: 55000,
      category: '생활',
      paymentMethod: '카드',
      schedule: { kind: 'monthly', day: dayAfter(todayDay, SOON_OFFSET) },
    },
    {
      name: '넷플릭스',
      amount: 13500,
      category: '생활',
      paymentMethod: '카드',
      schedule: { kind: 'monthly', day: dayAfter(todayDay, LATER_OFFSET) },
    },
  ];
}
