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

// 답 아래 미리 보기 순서: 최고·최저면 그 기록을 맨 위에 (답의 근거를 바로 보이게), 그 밖에는 검색 순서 그대로
export function orderForPreview(
  entries: readonly RecordEntry[],
  summary: NakiSummary,
): RecordEntry[] {
  if (summary.kind !== 'extreme') return [...entries];
  return [
    summary.entry,
    ...entries.filter((entry) => entry.id !== summary.entry.id),
  ];
}
