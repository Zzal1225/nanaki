import type { RecordEntryOf } from '@/features/records/schema/recordEntry';
import { EXPENSE_CATEGORIES } from '@/features/records/schema/expense';
import { getMonthRangeOf, toMonthString } from '@/shared/date/month';
import type { Budget } from './schema/budget';

// 예산 대비 쓴 돈 계산 (시안 13a 가계부 요약, 18 예산 화면). 순수 함수라 화면·날짜 없이 테스트한다.
// 지출은 그 달 가계부 기록의 금액 합 (가계부는 지출만 기록한다, README)

const PERCENT = 100;

export type CategoryProgress = {
  name: string;
  spent: number;
  limit: number;
  // 반올림한 % (100을 넘을 수 있다)
  percent: number;
  // 예산을 넘었는지 (같으면 넘지 않음). 화면은 색만이 아니라 아이콘 + "초과" 글자로도 알린다 (시안 18)
  isOver: boolean;
};

export type BudgetProgress = {
  spent: number;
  total: number | null;
  // 전체 예산 - 쓴 돈 (넘으면 음수). 전체 예산이 없으면 null
  remaining: number | null;
  percent: number | null;
  isOver: boolean;
  // 이번 달: 오늘을 뺀 남은 날 (10월 19일 → 12일, 시안 13a). 지난 달은 null, 다음 달 이후는 그 달 전체 일수
  daysLeft: number | null;
  // 예산을 정한 분류만. 순서: 기본 분류 순서 → 직접 입력 분류는 이름 순
  categories: CategoryProgress[];
  // 돈은 썼는데 예산을 정하지 않은 분류 (시안 18 "기타 · 예산 없음"). 같은 순서 규칙
  unbudgeted: { name: string; spent: number }[];
};

function percentOf(spent: number, limit: number): number {
  return Math.round((spent / limit) * PERCENT);
}

function categoryOrder(name: string): number {
  const index = (EXPENSE_CATEGORIES as readonly string[]).indexOf(name);
  return index === -1 ? EXPENSE_CATEGORIES.length : index;
}

function compareCategories(a: { name: string }, b: { name: string }): number {
  return (
    categoryOrder(a.name) - categoryOrder(b.name) ||
    a.name.localeCompare(b.name, 'ko')
  );
}

// 분류 이름 목록을 화면 순서로 (편집 시트의 칸 순서도 목록과 같게). 겹친 이름은 하나만
export function sortCategoryNames(names: Iterable<string>): string[] {
  return [...new Set(names)].sort((a, b) =>
    compareCategories({ name: a }, { name: b }),
  );
}

function daysLeftIn(month: string, today: string): number | null {
  const thisMonth = toMonthString(today);
  if (month < thisMonth) return null;
  const lastDay = Number(getMonthRangeOf(month).to.slice(-2));
  if (month > thisMonth) return lastDay;
  return lastDay - Number(today.slice(-2));
}

export function getBudgetProgress(
  budget: Budget,
  expenses: readonly RecordEntryOf<'expense'>[],
  today: string,
): BudgetProgress {
  const spentByCategory = new Map<string, number>();
  let spent = 0;
  for (const entry of expenses) {
    spent += entry.fields.amount;
    const category = entry.fields.category;
    spentByCategory.set(
      category,
      (spentByCategory.get(category) ?? 0) + entry.fields.amount,
    );
  }

  const categories = Object.entries(budget.categories)
    .map(([name, limit]) => {
      const categorySpent = spentByCategory.get(name) ?? 0;
      return {
        name,
        spent: categorySpent,
        limit,
        percent: percentOf(categorySpent, limit),
        isOver: categorySpent > limit,
      };
    })
    .sort(compareCategories);

  // in 연산자 대신 Object.hasOwn: 분류 이름이 'constructor'·'toString'이면 in은 상속 키까지 찾아 "예산 있음"으로 본다
  const unbudgeted = [...spentByCategory]
    .filter(([name]) => !Object.hasOwn(budget.categories, name))
    .map(([name, categorySpent]) => ({ name, spent: categorySpent }))
    .sort(compareCategories);

  const total = budget.total;
  return {
    spent,
    total,
    remaining: total === null ? null : total - spent,
    percent: total === null ? null : percentOf(spent, total),
    isOver: total !== null && spent > total,
    daysLeft: daysLeftIn(budget.month, today),
    categories,
    unbudgeted,
  };
}
