import { listBodyMeasurements, toBodyTitle } from '../schema/body';
import type { RecordEntry } from '../schema/recordEntry';
import type { RecordType } from '../schema/recordTypes';

// 타입 하나의 기록만 꺼낸 타입: EntryOf<'expense'> = 가계부 기록
type EntryOf<T extends RecordType> = Extract<RecordEntry, { type: T }>;

type RecordPresentation<T extends RecordType> = {
  // 목록 한 줄의 제목 (시안: "택시 · 교통")
  listTitle: (entry: EntryOf<T>) => string;
  // 목록 오른쪽 값 (시안: "-7,000원", "★ 4.0")
  listValue: (entry: EntryOf<T>) => string;
  // 기록 탭 타입 카드의 이번 달 값 (카드 안 꼬리표 "이번 달 지출"은 없앴다, 2026-10-22 사용자 결정)
  monthValue: (entries: EntryOf<T>[]) => string;
  // 기록 탭 타입 카드의 "지난달보다 …" 한 줄 (2026-10-22 사용자 결정).
  // 두 목록은 이미 같은 기간(getSamePeriod)으로 잘려 들어온다. 지난달 쪽이 비었으면 비교할 게 없어 null
  comparePreviousMonth: (
    current: EntryOf<T>[],
    previous: EntryOf<T>[],
  ) => PreviousMonthComparison | null;
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
    comparePreviousMonth: (current, previous) =>
      previous.length === 0
        ? null
        : describeChange(
            sumAmounts(current) - sumAmounts(previous),
            (amount) => `${amount.toLocaleString('ko-KR')}원`,
            ['덜 썼어요', '더 썼어요'],
          ),
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
    monthValue: (entries) => `${entries.length}건`,
    comparePreviousMonth: (current, previous) =>
      previous.length === 0
        ? null
        : describeChange(
            current.length - previous.length,
            (count) => `${count}건`,
            ['덜 썼어요', '더 썼어요'],
          ),
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
    // 시안: "12회". 운동은 "몇 번 했나"가 먼저라 시간 합계 대신 횟수
    monthValue: (entries) => `${entries.length}회`,
    // 카드 값과 같은 기준(횟수)으로 비교한다
    comparePreviousMonth: (current, previous) =>
      previous.length === 0
        ? null
        : describeChange(
            current.length - previous.length,
            (count) => `${count}회`,
            ['덜 했어요', '더 했어요'],
          ),
    detailKicker: (entry) => entry.fields.activity,
    headlineField: 'minutes',
    dayLabel: (entries) => `운동 ${entries.length}회`,
    // 하나면 "러닝 30분"(시안), 여럿이면 종목 대신 그날 총 시간
    dayValue: (entries) =>
      entries.length === 1
        ? `${entries[0].fields.activity} ${formatMinutes(entries[0].fields.minutes)}`
        : `총 ${formatMinutes(entries.reduce((sum, e) => sum + e.fields.minutes, 0))}`,
  },
  body: {
    // 제목을 비우면 적은 항목 이름("체중 · 허리")이 제목이 되어, 시안의 목록 제목과 같아진다
    listTitle: (entry) => entry.title,
    listValue: (entry) => formatMeasurement(entry.fields.weight, 'kg'),
    // 체형은 더하거나 셀 값이 아니라 "지금 몇 kg인지"가 궁금하다 (시안: 최근 체중 68.4kg)
    monthValue: (entries) => {
      const latest = latestEntryOf(entries);
      return latest ? formatMeasurement(latest.fields.weight, 'kg') : '—';
    },
    // 체중은 더하는 값이 아니라 상태라, 두 기간의 합이 아니라 "각 기간의 마지막 체중"끼리 비교한다.
    // 이번 기간에 잰 적이 없으면 지금 체중을 몰라 비교하지 않는다
    comparePreviousMonth: (current, previous) => {
      const now = latestEntryOf(current);
      const before = latestEntryOf(previous);
      if (!now || !before) return null;
      // 68.4 - 69.2 = -0.7999999999999972 (부동소수점) → 소수 한 자리로
      const difference = Number(
        (now.fields.weight - before.fields.weight).toFixed(1),
      );
      return describeChange(difference, (kg) => formatMeasurement(kg, 'kg'), [
        '줄었어요',
        '늘었어요',
      ]);
    },
    detailKicker: (entry) => toBodyTitle(entry.fields),
    headlineField: 'weight',
    dayLabel: () => '체형',
    // 시안: "68.4kg · 허리 78cm". 체중과 그다음 적은 항목 하나만 (한 줄에 다 넣으면 잘린다).
    // 하루에 여러 번 쟀으면 마지막 기록 (펼치면 모두 보인다)
    dayValue: (entries) => {
      const latest = latestEntryOf(entries);
      if (!latest) return '';
      const [weight, next] = listBodyMeasurements(latest.fields);
      const weightText = formatMeasurement(weight.value, weight.unit);
      return next
        ? `${weightText} · ${next.label} ${formatMeasurement(next.value, next.unit)}`
        : weightText;
    },
  },
};

function sumAmounts(entries: EntryOf<'expense'>[]): number {
  return entries.reduce((sum, entry) => sum + entry.fields.amount, 0);
}

// 비교 한 줄을 글자 하나가 아니라 조각으로 넘긴다: 카드가 수치(amount)만 굵게 그려야 해서 (2026-10-22 사용자 결정).
// 같으면 수치가 없다
export type PreviousMonthComparison =
  { kind: 'same' } | { kind: 'changed'; amount: string; word: string };

// "지난달보다 12,000원 덜 썼어요" / "지난달보다 2건 더 썼어요" / "지난달과 같아요".
// 비교 기간은 같은 기간(1일~오늘 vs 지난달 1일~같은 날)이지만, 문구는 짧게 "지난달보다"로 (사용자 결정).
// 늘고 준 것을 색으로 칠하지 않는다: 덜 쓴 것·체중이 준 것이 늘 좋은 건 아니다
function describeChange(
  difference: number,
  formatAmount: (absolute: number) => string,
  [lessWord, moreWord]: readonly [string, string],
): PreviousMonthComparison {
  if (difference === 0) return { kind: 'same' };
  return {
    kind: 'changed',
    amount: formatAmount(Math.abs(difference)),
    word: difference < 0 ? lessWord : moreWord,
  };
}

// 화면 읽기·테스트용 한 줄 글자 (카드는 조각을 따로 그린다)
export function formatPreviousMonthComparison(
  comparison: PreviousMonthComparison,
): string {
  return comparison.kind === 'same'
    ? '지난달과 같아요'
    : `지난달보다 ${comparison.amount} ${comparison.word}`;
}

// 68.4 + 'kg' → '68.4kg'. 체형 측정값은 단위가 항목마다 달라(kg·cm·%) 단위를 받는다
export function formatMeasurement(value: number, unit: string): string {
  return `${value.toLocaleString('ko-KR')}${unit}`;
}

// 가장 늦은 날짜의 기록. 같은 날이면 배열에서 뒤의 것(조회가 만든 순서로 나중에 쓴 것)
export function latestEntryOf<T extends { occurredAt: string }>(
  entries: T[],
): T | undefined {
  return entries.reduce<T | undefined>(
    (latest, entry) =>
      latest === undefined || entry.occurredAt >= latest.occurredAt
        ? entry
        : latest,
    undefined,
  );
}

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

// 기록 탭 카드의 비교 한 줄. 여러 타입이 섞인 두 목록(이번 기간·지난달 같은 기간)에서 그 타입만 골라 비교한다
export function getPreviousMonthComparison(
  type: RecordType,
  currentEntries: RecordEntry[],
  previousEntries: RecordEntry[],
): PreviousMonthComparison | null {
  const ofType = (entries: RecordEntry[]) =>
    entries.filter((entry) => entry.type === type);
  return presentationOf(type).comparePreviousMonth(
    ofType(currentEntries) as never,
    ofType(previousEntries) as never,
  );
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
