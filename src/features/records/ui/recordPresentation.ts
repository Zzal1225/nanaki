import type { RecordEntry } from '../schema/recordEntry';
import type { RecordType } from '../schema/recordTypes';

// 타입 하나의 기록만 꺼낸 타입: EntryOf<'expense'> = 가계부 기록
type EntryOf<T extends RecordType> = Extract<RecordEntry, { type: T }>;

type RecordPresentation<T extends RecordType> = {
  // 목록 한 줄의 제목 (시안: "택시 · 교통")
  listTitle: (entry: EntryOf<T>) => string;
  // 목록 오른쪽 값 (시안: "-7,000원", "★ 4.0")
  listValue: (entry: EntryOf<T>) => string;
  // 기록 탭 타입 카드의 이름과 이번 달 값
  monthMetric: string;
  monthValue: (entries: EntryOf<T>[]) => string;
};

// 타입마다 어떻게 보여 줄지는 여기 한 곳에만 둔다. 목록·카드 컴포넌트는 이 함수만 불러서
// 컴포넌트 안에 if (type === 'expense')가 생기지 않는다 (CLAUDE.md 규칙)
const RECORD_PRESENTATION: { [T in RecordType]: RecordPresentation<T> } = {
  expense: {
    listTitle: (entry) => `${entry.title} · ${entry.fields.category}`,
    listValue: (entry) => formatExpenseAmount(entry.fields.amount),
    monthMetric: '이번 달 지출',
    monthValue: (entries) =>
      formatExpenseAmount(entries.reduce((sum, e) => sum + e.fields.amount, 0)),
  },
  review: {
    listTitle: (entry) => entry.title,
    listValue: (entry) => formatRating(entry.fields.rating),
    monthMetric: '이번 달 작성',
    monthValue: (entries) => `${entries.length}건`,
  },
};

// 지출만 기록하므로 화면에서만 마이너스를 붙인다 (저장은 양수). 0원에는 붙이지 않는다
export function formatExpenseAmount(amount: number): string {
  const formatted = `${amount.toLocaleString('ko-KR')}원`;
  return amount === 0 ? formatted : `-${formatted}`;
}

export function formatRating(rating: number): string {
  return `★ ${rating.toFixed(1)}`;
}

// TypeScript는 "entry.type과 RECORD_PRESENTATION[entry.type]이 같은 타입"이라는 짝을 추적하지 못한다
// (correlated union). entry.type으로 꺼낸 함수에 그 entry를 넘기므로 실제로는 항상 짝이 맞아서, 여기 한 곳에서만 넓혀 쓴다
function presentationOf(type: RecordType): RecordPresentation<RecordType> {
  return RECORD_PRESENTATION[type] as unknown as RecordPresentation<RecordType>;
}

export function getListTitle(entry: RecordEntry): string {
  return presentationOf(entry.type).listTitle(entry as never);
}

export function getListValue(entry: RecordEntry): string {
  return presentationOf(entry.type).listValue(entry as never);
}

export function getMonthMetric(type: RecordType): string {
  return RECORD_PRESENTATION[type].monthMetric;
}

// 여러 타입이 섞인 목록에서 그 타입만 골라 이번 달 값을 만든다
export function getMonthValue(
  type: RecordType,
  entries: RecordEntry[],
): string {
  const ofType = entries.filter((entry) => entry.type === type);
  return presentationOf(type).monthValue(ofType as never);
}
