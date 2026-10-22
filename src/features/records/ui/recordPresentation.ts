import {
  BODY_MEASURE_LABEL,
  BODY_MEASURE_UNIT,
  measureOf,
  type BodyMeasure,
} from '../schema/body';
import { getAchievement } from '@/features/routines/progress';
import type { Routine } from '@/features/routines/schema/routine';
import type { SamePeriod } from '@/shared/date/samePeriod';
import type { RecordEntry } from '../schema/recordEntry';
import type { RecordType } from '../schema/recordTypes';
import { formatCheckProgress } from '../schema/routineCheck';

// 타입 하나의 기록만 꺼낸 타입: EntryOf<'expense'> = 가계부 기록
type EntryOf<T extends RecordType> = Extract<RecordEntry, { type: T }>;

// 기록 탭 카드 값을 만들 때 기록 말고 더 필요한 것. 지금은 루틴 달성률만 쓴다:
// 달성률은 "해야 했던 날"(루틴 규칙)과 비교 기간이 있어야 계산된다. 다른 타입은 받기만 하고 쓰지 않는다
export type MonthContext = {
  routines: Routine[];
  // 이번 달 1일~오늘 / 지난달 1일~같은 날. 오늘을 읽기 전이면 null
  period: SamePeriod | null;
};

type RecordPresentation<T extends RecordType> = {
  // 목록 한 줄의 제목: "[분류] 제목" 꼴 (2026-10-22 사용자 결정: "[교통] 택시", "[러닝] 5.2km", "[체중]")
  listTitle: (entry: EntryOf<T>) => string;
  // 목록 오른쪽 값 (시안: "-7,000원", "★ 4.0")
  listValue: (entry: EntryOf<T>) => string;
  // 기록 탭 타입 카드의 이번 달 값 (카드 안 꼬리표 "이번 달 지출"은 없앴다, 2026-10-22 사용자 결정)
  monthValue: (entries: EntryOf<T>[], context: MonthContext) => string;
  // 기록 탭 타입 카드의 "지난달보다 …" 한 줄 (2026-10-22 사용자 결정).
  // 두 목록은 이미 같은 기간(getSamePeriod)으로 잘려 들어온다. 지난달 쪽이 비었으면 비교할 게 없어 null
  comparePreviousMonth: (
    current: EntryOf<T>[],
    previous: EntryOf<T>[],
    context: MonthContext,
  ) => PreviousMonthComparison | null;
  // 상세에서 제목 아래 크게 보여 준 필드(= 목록 값). 아래 표에서는 빼서 같은 값이 두 번 나오지 않게 한다.
  // 기록마다 다를 수 있어 함수다 (체형: 체중 기록이면 체중, 허리둘레 기록이면 허리둘레).
  // 상세 위 배지는 타입 이름만 보여 준다 (2026-10-22 사용자 결정: "가계부 · 교통"처럼 항목까지는 어색하다)
  headlineField: (entry: EntryOf<T>) => string;
  // 홈 하루 요약 한 줄: 이름과 값 (시안: "가계부 3건 · -32,000원", "후기 1건 · 동네 로스터리 ★4")
  dayLabel: (entries: EntryOf<T>[]) => string;
  dayValue: (entries: EntryOf<T>[]) => string;
};

// 타입마다 어떻게 보여 줄지는 여기 한 곳에만 둔다. 목록·카드 컴포넌트는 이 함수만 불러서
// 컴포넌트 안에 if (type === 'expense')가 생기지 않는다 (CLAUDE.md 규칙)
const RECORD_PRESENTATION: { [T in RecordType]: RecordPresentation<T> } = {
  expense: {
    listTitle: (entry) => `[${entry.fields.category}] ${entry.title}`,
    listValue: (entry) => formatExpenseAmount(entry.fields.amount),
    comparePreviousMonth: (current, previous) =>
      previous.length === 0
        ? null
        : describeChange(
            sumAmounts(current) - sumAmounts(previous),
            (amount) => `${amount.toLocaleString('ko-KR')}원`,
            ['덜 썼어요', '더 썼어요'],
          ),
    monthValue: (entries) => formatExpenseAmount(sumAmounts(entries)),
    headlineField: () => 'amount',
    dayLabel: (entries) => `가계부 ${entries.length}건`,
    dayValue: (entries) => formatExpenseAmount(sumAmounts(entries)),
  },
  review: {
    listTitle: (entry) => `[${entry.fields.targetKind}] ${entry.title}`,
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
    headlineField: () => 'rating',
    dayLabel: (entries) => `후기 ${entries.length}건`,
    // 후기는 더할 값이 없어서 첫 대상의 이름을 보여 주고, 여러 개면 나머지 개수만 붙인다
    dayValue: ([first, ...rest]) =>
      rest.length === 0
        ? `${first.title} ${formatRating(first.fields.rating)}`
        : `${first.title} 외 ${rest.length}건`,
  },
  workout: {
    // "[러닝] 5.2km", 거리가 없으면 "[헬스]". 제목은 쓰지 않는다 (운동은 제목 칸이 없다, 종목이 곧 이름)
    listTitle: (entry) => {
      const { activity, distance } = entry.fields;
      return distance === undefined
        ? `[${activity}]`
        : `[${activity}] ${formatDistance(distance)}`;
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
    headlineField: () => 'minutes',
    dayLabel: (entries) => `운동 ${entries.length}회`,
    // 하나면 "러닝 30분"(시안), 여럿이면 종목 대신 그날 총 시간
    dayValue: (entries) =>
      entries.length === 1
        ? `${entries[0].fields.activity} ${formatMinutes(entries[0].fields.minutes)}`
        : `총 ${formatMinutes(entries.reduce((sum, e) => sum + e.fields.minutes, 0))}`,
  },
  routine: {
    // "[물 마시기]": 체크한 그날의 루틴 이름(제목에 남겨 둔다). 값은 "완료" / "5/8잔"
    listTitle: (entry) => `[${entry.title}]`,
    listValue: (entry) => formatCheckProgress(entry.fields),
    // 이번 달 달성률 (2026-10-22 사용자 결정, 시안 "달성률 83%"): 1일~오늘 중 해야 했던 날 대비 목표를 채운 날.
    // 루틴 규칙(context.routines)이 있어야 "해야 했던 날"을 안다. 해야 할 날이 없으면 —
    monthValue: (entries, { routines, period }) => {
      if (!period) return '—';
      const { rate } = getAchievement(routines, entries, period.current);
      return rate === null ? '—' : `${rate}%`;
    },
    // 두 기간의 달성률 차이 (%p). 지난달 같은 기간에 해야 할 날이 없었으면 비교하지 않는다
    comparePreviousMonth: (current, previous, { routines, period }) => {
      if (!period) return null;
      const now = getAchievement(routines, current, period.current).rate;
      const before = getAchievement(routines, previous, period.previous).rate;
      if (now === null || before === null) return null;
      return describeChange(now - before, (points) => `${points}%p`, [
        '낮아요',
        '높아요',
      ]);
    },
    headlineField: () => 'count',
    // 홈 하루 요약의 루틴 줄은 기록이 아니라 그날 일정으로 따로 그린다 (RoutineDayRow). 이 둘은 쓰이지 않을 때를 위한 값
    dayLabel: () => '루틴',
    dayValue: (entries) =>
      `완료 ${entries.filter((entry) => entry.fields.count >= entry.fields.target).length}개`,
  },
  body: {
    // "[체중]" / "[허리둘레]": 한 기록에 하나만 잰다 (둘 다 있는 예전 기록은 체중)
    listTitle: (entry) => `[${BODY_MEASURE_LABEL[measureOf(entry.fields)]}]`,
    listValue: (entry) =>
      formatBodyMeasure(entry.fields, measureOf(entry.fields)),
    // 체형은 더하거나 셀 값이 아니라 "지금 몇 kg인지"가 궁금하다. 허리둘레만 잰 기록은 건너뛴다
    monthValue: (entries) => {
      const latest = latestEntryOf(withWeight(entries));
      return latest ? formatBodyMeasure(latest.fields, 'weight') : '—';
    },
    // 체중은 더하는 값이 아니라 상태라, 두 기간의 합이 아니라 "각 기간의 마지막 체중"끼리 비교한다.
    // 이번 기간에 잰 적이 없으면 지금 체중을 몰라 비교하지 않는다
    comparePreviousMonth: (current, previous) => {
      const now = latestEntryOf(withWeight(current))?.fields.weight;
      const before = latestEntryOf(withWeight(previous))?.fields.weight;
      if (now === undefined || before === undefined) return null;
      return describeChange(
        roundToOneDecimal(now - before),
        (kg) => formatMeasurement(kg, 'kg'),
        ['줄었어요', '늘었어요'],
      );
    },
    headlineField: (entry) => measureOf(entry.fields),
    dayLabel: () => '체형',
    // 시안: "68.4kg · 허리둘레 78cm". 그날 마지막 체중과 마지막 허리둘레 (따로 잰 두 기록을 한 줄에)
    dayValue: (entries) => {
      const weight = latestEntryOf(withWeight(entries));
      const waist = latestEntryOf(
        entries.filter((entry) => entry.fields.waist !== undefined),
      );
      return [
        weight && formatBodyMeasure(weight.fields, 'weight'),
        waist &&
          `${BODY_MEASURE_LABEL.waist} ${formatBodyMeasure(waist.fields, 'waist')}`,
      ]
        .filter(Boolean)
        .join(' · ');
    },
  },
};

function sumAmounts(entries: EntryOf<'expense'>[]): number {
  return entries.reduce((sum, entry) => sum + entry.fields.amount, 0);
}

function withWeight(entries: EntryOf<'body'>[]): EntryOf<'body'>[] {
  return entries.filter((entry) => entry.fields.weight !== undefined);
}

// 68.4 - 69.2 = -0.7999999999999972 (부동소수점) → -0.8
export function roundToOneDecimal(value: number): number {
  return Number(value.toFixed(1));
}

function formatBodyMeasure(
  fields: EntryOf<'body'>['fields'],
  measure: BodyMeasure,
): string {
  return formatMeasurement(fields[measure] ?? 0, BODY_MEASURE_UNIT[measure]);
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

// 68.4 + 'kg' → '68.4kg'. 체형 측정값은 단위가 항목마다 달라(kg·cm) 단위를 받는다
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
  context: MonthContext = EMPTY_CONTEXT,
): PreviousMonthComparison | null {
  const ofType = (entries: RecordEntry[]) =>
    entries.filter((entry) => entry.type === type);
  return presentationOf(type).comparePreviousMonth(
    ofType(currentEntries) as never,
    ofType(previousEntries) as never,
    context,
  );
}

// 루틴을 모르는 곳(테스트, 루틴이 없는 계정)의 기본값
const EMPTY_CONTEXT: MonthContext = { routines: [], period: null };

// 여러 타입이 섞인 목록에서 그 타입만 골라 이번 달 값을 만든다
export function getMonthValue(
  type: RecordType,
  entries: RecordEntry[],
  context: MonthContext = EMPTY_CONTEXT,
): string {
  const ofType = entries.filter((entry) => entry.type === type);
  return presentationOf(type).monthValue(ofType as never, context);
}

export function getHeadlineField(entry: RecordEntry): string {
  return presentationOf(entry.type).headlineField(entry as never);
}

// 홈 하루 요약: 같은 타입의 그날 기록을 받는다. 빈 배열은 넘기지 않는다 (그 타입 줄을 아예 그리지 않으므로)
export function getDayLabel(type: RecordType, entries: RecordEntry[]): string {
  return presentationOf(type).dayLabel(entries as never);
}

export function getDayValue(type: RecordType, entries: RecordEntry[]): string {
  return presentationOf(type).dayValue(entries as never);
}
