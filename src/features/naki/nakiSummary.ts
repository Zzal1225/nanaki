import type { RecordEntry } from '@/features/records/schema/recordEntry';
import type { RecordType } from '@/features/records/schema/recordTypes';
import { formatExpenseAmount } from '@/features/records/ui/recordPresentation';
import { formatShortDate } from '@/shared/date/formatDisplayDate';
import {
  getMetricFields,
  LIST_AGGREGATE,
  type MetricField,
  type NakiAggregate,
} from './nakiAggregate';

// 답의 숫자 한 줄 (34e 사용자 결정: 짧은 숫자형 "합계 -412,000원 · 23건", "최저 체중 68.4kg · 10.19 (일)").
// 계산은 AI가 아니라 앱이 기기에서 한다 (README 6). 문장을 지어내지 않고 숫자만 정해진 틀에 넣는다

export type NakiSummary =
  | { kind: 'empty' }
  | { kind: 'count'; count: number }
  | { kind: 'total'; field: MetricField; total: number; count: number }
  | { kind: 'average'; field: MetricField; average: number; count: number }
  | {
      kind: 'extreme';
      which: 'max' | 'min';
      field: MetricField;
      value: number;
      entry: RecordEntry;
      count: number;
    };

type Measured = { entry: RecordEntry; value: number };

// 그 칸에 숫자가 있는 기록만 (체형은 체중·허리둘레가 한 기록에 하나씩이라 체중 질문에서 허리둘레 기록은 뺀다)
function measure(
  entries: readonly RecordEntry[],
  field: MetricField,
): Measured[] {
  return entries.flatMap((entry) => {
    const value = (entry.fields as Record<string, unknown>)[field.name];
    return typeof value === 'number' && Number.isFinite(value)
      ? [{ entry, value }]
      : [];
  });
}

function resolveField(
  type: RecordType | null,
  name: string | null,
): MetricField | null {
  if (!type || !name) return null;
  return getMetricFields(type).find((field) => field.name === name) ?? null;
}

export function summarizeNakiResults(
  entries: readonly RecordEntry[],
  type: RecordType | null,
  aggregate: NakiAggregate = LIST_AGGREGATE,
): NakiSummary {
  if (entries.length === 0) return { kind: 'empty' };
  // 목록 질문: 예전 그대로 가계부면 금액 합계, 그 밖에는 건수
  const { intent, field: fieldName } =
    aggregate.intent === 'list'
      ? type === 'expense'
        ? { intent: 'sum' as const, field: 'amount' }
        : { intent: 'count' as const, field: null }
      : aggregate;
  const field = resolveField(type, fieldName);
  if (intent === 'count' || !field) {
    return { kind: 'count', count: entries.length };
  }
  const measured = measure(entries, field);
  if (measured.length === 0) return { kind: 'count', count: entries.length };
  const count = measured.length;
  if (intent === 'sum') {
    const total = measured.reduce((sum, item) => sum + item.value, 0);
    return { kind: 'total', field, total, count };
  }
  if (intent === 'avg') {
    const total = measured.reduce((sum, item) => sum + item.value, 0);
    return { kind: 'average', field, average: total / count, count };
  }
  // 같은 값이면 먼저 온 기록(검색 정렬 = 최신순)을 고른다
  const best = measured.reduce((current, item) =>
    (intent === 'max' ? item.value > current.value : item.value < current.value)
      ? item
      : current,
  );
  return {
    kind: 'extreme',
    which: intent === 'max' ? 'max' : 'min',
    field,
    value: best.value,
    entry: best.entry,
    count,
  };
}

// 숫자를 그 칸의 단위로. 금액은 지출이라 마이너스를 붙이는 앱 공통 표기 (formatExpenseAmount)
function formatValue(field: MetricField, value: number): string {
  if (field.name === 'amount') return formatExpenseAmount(Math.round(value));
  const text = value.toLocaleString('ko-KR', {
    maximumFractionDigits: field.decimals,
  });
  return `${text}${field.unit}`;
}

export function formatNakiSummary(summary: NakiSummary): string {
  switch (summary.kind) {
    case 'empty':
      return '이 조건에 맞는 기록이 없어요';
    case 'count':
      return `모두 ${summary.count}건이에요`;
    case 'total':
      return `합계 ${formatValue(summary.field, summary.total)} · ${summary.count}건`;
    case 'average':
      return summary.field.isRating
        ? `평균 별점 ${formatValue(summary.field, summary.average)} · ${summary.count}건`
        : `평균 ${formatValue(summary.field, summary.average)} · ${summary.count}건`;
    case 'extreme':
      return `${summary.which === 'max' ? '최고' : '최저'} ${summary.field.label} ${formatValue(summary.field, summary.value)} · ${formatShortDate(summary.entry.occurredAt)}`;
  }
}

// 답을 눈에 띄게 두 줄로 (2026-10-24 아이폰 확인 뒤 사용자: "최저 체중 …"이 더 뚜렷하게).
// 이름줄(작게) + 값(크게): 기록 상세의 큰 숫자와 같은 모양이라 "답 = 이 숫자"가 바로 보인다.
// 없으면(기록 없음) null → 한 줄 문장(formatNakiSummary) 그대로
export type NakiSummaryParts = { label: string; value: string };

export function formatNakiSummaryParts(
  summary: NakiSummary,
): NakiSummaryParts | null {
  switch (summary.kind) {
    case 'empty':
      return null;
    case 'count':
      return { label: '건수', value: `${summary.count}건` };
    case 'total':
      return {
        label: `합계 · ${summary.count}건`,
        value: formatValue(summary.field, summary.total),
      };
    case 'average':
      return {
        label: `${summary.field.isRating ? '평균 별점' : '평균'} · ${summary.count}건`,
        value: formatValue(summary.field, summary.average),
      };
    case 'extreme':
      return {
        label: `${summary.which === 'max' ? '최고' : '최저'} ${summary.field.label} · ${formatShortDate(summary.entry.occurredAt)}`,
        value: formatValue(summary.field, summary.value),
      };
  }
}

// 답 아래 미리 보기: 숫자를 계산한 답(합계·평균·최고·최저)이면 그 칸에 숫자가 있는 기록만 보여 준다.
// "최저 체중"에 체중 없는 눈바디·허리둘레 기록이 섞여 나왔다 (2026-10-25 아이폰 확인 11). 계산은 이미 그 칸만 셌는데
// 목록이 조건(체형) 전체였다. "기록 탭에서 이 조건으로 보기"는 조건 그대로 넘겨 전체를 보여 주는 게 맞아 건드리지 않는다.
// 순서: 최고·최저면 그 기록을 맨 위에 (답의 근거를 바로 보이게), 그 밖에는 검색 순서 그대로
export function orderForPreview(
  entries: readonly RecordEntry[],
  summary: NakiSummary,
): RecordEntry[] {
  const shown =
    summary.kind === 'total' ||
    summary.kind === 'average' ||
    summary.kind === 'extreme'
      ? measure(entries, summary.field).map((item) => item.entry)
      : [...entries];
  if (summary.kind !== 'extreme') return shown;
  return [
    summary.entry,
    ...shown.filter((entry) => entry.id !== summary.entry.id),
  ];
}

// ── 비교 (2026-10-26 사용자 결정 "지난달보다 많이 썼어?") ─────────

export type NakiComparison =
  | { kind: 'same'; previousValue: string }
  | { kind: 'changed'; amount: string; word: string; previousValue: string };

type ComparableValue = {
  value: number;
  format: (absolute: number) => string;
  words: readonly [less: string, more: string];
};

// 두 기간을 견줄 값. 기록이 없는 기간은 합계·건수 0으로 본다 (평균은 기록이 없으면 견줄 수 없다)
function toComparable(
  summary: NakiSummary,
  shape: NakiSummary,
): ComparableValue | null {
  const kind = summary.kind === 'empty' ? shape.kind : summary.kind;
  if (kind === 'count') {
    return {
      value: summary.kind === 'count' ? summary.count : 0,
      format: (n) => `${n}건`,
      words: ['적어요', '많아요'],
    };
  }
  if (kind === 'total' && shape.kind === 'total') {
    const { field } = shape;
    const isAmount = field.name === 'amount';
    return {
      value: summary.kind === 'total' ? summary.total : 0,
      // 금액 차이는 마이너스 없이 "42,000원 더 썼어요" (지출 표기 -는 차이에 어울리지 않는다)
      format: (n) =>
        isAmount
          ? `${Math.round(n).toLocaleString('ko-KR')}원`
          : formatValue(field, n),
      words: isAmount ? ['덜 썼어요', '더 썼어요'] : ['적어요', '많아요'],
    };
  }
  if (kind === 'average' && summary.kind === 'average') {
    const { field } = summary;
    return {
      value: summary.average,
      format: (n) => formatValue(field, n),
      words: ['낮아요', '높아요'],
    };
  }
  return null;
}

// 지금 기간 답(current)과 견줄 기간 답(previous)의 차이. 견줄 수 없으면 null (최고·최저, 둘 다 기록 없음, 평균인데 한쪽이 비었음)
export function compareNakiSummaries(
  current: NakiSummary,
  previous: NakiSummary,
): NakiComparison | null {
  // 모양(합계인지 건수인지)은 기록이 있는 쪽으로 정한다
  const shape = current.kind !== 'empty' ? current : previous;
  if (shape.kind === 'empty' || shape.kind === 'extreme') return null;
  const now = toComparable(current, shape);
  const before = toComparable(previous, shape);
  if (!now || !before) return null;
  const previousValue =
    previous.kind === 'empty'
      ? before.format(0)
      : (formatNakiSummaryParts(previous)?.value ??
        before.format(before.value));
  // 소수(평균)는 보이는 자리에서 같으면 같다고 본다
  const difference = Math.round((now.value - before.value) * 10) / 10;
  if (difference === 0) return { kind: 'same', previousValue };
  return {
    kind: 'changed',
    amount: now.format(Math.abs(difference)),
    word: difference < 0 ? before.words[0] : before.words[1],
    previousValue,
  };
}
