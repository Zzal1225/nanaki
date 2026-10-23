import type { FieldDef } from '@/features/records/schema/fieldKinds';
import {
  RECORD_TYPE_CONFIG,
  type RecordType,
} from '@/features/records/schema/recordTypes';

// 나키 집계(34e): 질문이 원하는 계산(의도)과 계산할 숫자 칸. AI는 "무엇을 계산할지"만 고르고 계산은 앱이 기기에서 한다.
// 사람이 기록에 묻는 말은 대개 목록이 아니라 숫자다("지난달 식비 얼마?", "체중 제일 낮았던 게 언제?").
// 검색창으로는 못 하는 일이라 "왜 AI를 썼나"에 답이 된다. 비교("지난달보다")는 다음 단계

export const NAKI_INTENTS = [
  'list',
  'sum',
  'count',
  'avg',
  'max',
  'min',
] as const;
export type NakiIntent = (typeof NAKI_INTENTS)[number];

// 서버가 걸러서 브라우저에 주는 계산 조건. field는 그 타입의 숫자 칸 이름 (sum·avg·max·min일 때만)
export type NakiAggregate = { intent: NakiIntent; field: string | null };

export const LIST_AGGREGATE: NakiAggregate = { intent: 'list', field: null };

export type MetricField = {
  name: string;
  label: string;
  unit: string;
  // 평균·표시 자릿수. 금액·분은 정수, 체중·거리·별점은 소수 한 자리
  decimals: number;
  isRating: boolean;
};

const RATING_DECIMALS = 1;

// 그 타입의 숫자 칸(숫자·별점). 순서 = 필드 정의 순서라 첫 칸이 기본 계산 칸이다
// (가계부 금액, 후기 별점, 운동 시간, 체형 체중. 루틴 체크는 숫자 칸이 없어 건수만 센다)
export function getMetricFields(type: RecordType): MetricField[] {
  const fields = RECORD_TYPE_CONFIG[type].fields as readonly (FieldDef & {
    unit?: string;
    decimals?: number;
  })[];
  return fields.flatMap((field): MetricField[] => {
    if (field.kind === 'number') {
      return [
        {
          name: field.name,
          label: field.label,
          unit: field.unit ?? '',
          decimals: field.decimals ?? 0,
          isRating: false,
        },
      ];
    }
    if (field.kind === 'rating') {
      return [
        {
          name: field.name,
          label: field.label,
          unit: '',
          decimals: RATING_DECIMALS,
          isRating: true,
        },
      ];
    }
    return [];
  });
}

function needsMetric(intent: NakiIntent): boolean {
  return (
    intent === 'sum' || intent === 'avg' || intent === 'max' || intent === 'min'
  );
}

function parseIntent(value: string | null): NakiIntent {
  return NAKI_INTENTS.find((intent) => intent === value) ?? 'list';
}

// AI가 고른 의도·칸을 믿지 않고 거른다: 모르는 의도는 list, 칸은 그 타입의 숫자 칸일 때만, 아니면 기본 칸.
// 타입이 없거나(여러 타입을 섞어 더할 수 없다) 숫자 칸이 없는 타입(루틴)이면 계산 대신 건수
export function toNakiAggregate(
  intentValue: string | null,
  metric: string | null,
  type: RecordType | null,
): NakiAggregate {
  const intent = parseIntent(intentValue);
  if (!needsMetric(intent)) return { intent, field: null };
  const fields = type ? getMetricFields(type) : [];
  if (fields.length === 0) return { intent: 'count', field: null };
  const field = fields.find((item) => item.name === metric) ?? fields[0];
  return { intent, field: field.name };
}
