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
  // 상세 위쪽 칩의 두 번째 말 (시안: "가계부 · 식비", "후기 · 장소")
  detailKicker: (entry: EntryOf<T>) => string;
  // 상세에서 제목 아래 크게 보여 줄 필드. 아래 표에서는 빼서 같은 값이 두 번 나오지 않게 한다
  headlineField: keyof EntryOf<T>['fields'];
  // 홈 하루 요약 한 줄: 이름과 값 (시안: "가계부 3건 · -32,000원", "후기 1건 · 동네 로스터리 ★4")
  dayLabel: (entries: EntryOf<T>[]) => string;
  dayValue: (entries: EntryOf<T>[]) => string;
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
    detailKicker: (entry) => entry.fields.category,
    headlineField: 'amount',
    dayLabel: (entries) => `가계부 ${entries.length}건`,
    dayValue: (entries) =>
      formatExpenseAmount(entries.reduce((sum, e) => sum + e.fields.amount, 0)),
  },
  review: {
    listTitle: (entry) => entry.title,
    listValue: (entry) => formatRating(entry.fields.rating),
    monthMetric: '이번 달 작성',
    monthValue: (entries) => `${entries.length}건`,
    detailKicker: (entry) => entry.fields.targetKind,
    headlineField: 'rating',
    dayLabel: (entries) => `후기 ${entries.length}건`,
    // 후기는 더할 값이 없어서 첫 대상의 이름을 보여 주고, 여러 개면 나머지 개수만 붙인다
    dayValue: ([first, ...rest]) =>
      rest.length === 0
        ? `${first.title} ${formatRating(first.fields.rating)}`
        : `${first.title} 외 ${rest.length}건`,
  },
  workout: {
    // 시안: "헬스 · 하체", "러닝 5km". 제목을 비워 종목 이름이 제목이 된 기록은 "러닝 · 러닝"이 되지 않게 한 번만
    listTitle: (entry) => {
      const { activity, distance } = entry.fields;
      const name =
        entry.title === activity ? activity : `${activity} · ${entry.title}`;
      return distance === undefined
        ? name
        : `${name} ${formatDistance(distance)}`;
    },
    listValue: (entry) => formatMinutes(entry.fields.minutes),
    monthMetric: '이번 달 운동',
    // 시안: "12회". 운동은 "몇 번 했나"가 먼저라 시간 합계 대신 횟수
    monthValue: (entries) => `${entries.length}회`,
    detailKicker: (entry) => entry.fields.activity,
    headlineField: 'minutes',
    dayLabel: (entries) => `운동 ${entries.length}회`,
    // 하나면 "러닝 30분"(시안), 여럿이면 종목 대신 그날 총 시간
    dayValue: (entries) =>
      entries.length === 1
        ? `${entries[0].fields.activity} ${formatMinutes(entries[0].fields.minutes)}`
        : `총 ${formatMinutes(entries.reduce((sum, e) => sum + e.fields.minutes, 0))}`,
  },
};

export function formatMinutes(minutes: number): string {
  return `${minutes.toLocaleString('ko-KR')}분`;
}

// 5 → '5km', 5.5 → '5.5km'. 소수 자리는 저장된 값 그대로 (입력이 한 자리까지라 늘어나지 않는다)
export function formatDistance(km: number): string {
  return `${km.toLocaleString('ko-KR')}km`;
}

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

export function getDetailKicker(entry: RecordEntry): string {
  return presentationOf(entry.type).detailKicker(entry as never);
}

export function getHeadlineField(type: RecordType): string {
  return String(RECORD_PRESENTATION[type].headlineField);
}

// 홈 하루 요약: 같은 타입의 그날 기록을 받는다. 빈 배열은 넘기지 않는다 (그 타입 줄을 아예 그리지 않으므로)
export function getDayLabel(type: RecordType, entries: RecordEntry[]): string {
  return presentationOf(type).dayLabel(entries as never);
}

export function getDayValue(type: RecordType, entries: RecordEntry[]): string {
  return presentationOf(type).dayValue(entries as never);
}
