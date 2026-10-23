import { z } from 'zod';
import { MAX_SEARCH_KEYWORD_LENGTH } from '@/features/records/api/searchQuery';
import {
  RECORD_TYPE_CONFIG,
  type RecordType,
} from '@/features/records/schema/recordTypes';
import {
  getFilterFields,
  type FieldFilter,
  type FieldFilters,
} from '@/features/search/searchFilters';
import {
  EMPTY_SEARCH_STATE,
  type SearchState,
} from '@/features/search/searchState';
import { isDateString } from '@/shared/date/calendar';
import { formatDisplayDate } from '@/shared/date/formatDisplayDate';

// 나키: 질문 → AI가 만든 조건 → 우리 검색 조건(SearchState). AI는 조건만 만들고, 찾기·계산은 우리가 한다 (README 6).
// 이 파일은 순수 함수만: 서버(Route Handler)와 브라우저가 함께 쓰고, AI 없이 테스트한다.
// AI 제공자 코드는 server/nakiModel.ts 한 파일에만 있다 (CLAUDE.md)

// ── AI가 돌려줄 모양 ─────────────────────────────────

// 평평한 모양으로 받는다: 판별 유니온·레코드 같은 복잡한 JSON 스키마는 모델마다 구조화 출력 지원이 들쭉날쭉하다.
// 이 스키마는 "모양"만 본다. 무엇을 허용할지(켜진 타입, 그 타입의 칸, 연산자)는 toSearchState가 다시 거른다
export const nakiAiOutputSchema = z.object({
  // 기록 찾기 질문으로 이해했는지. 인사·조언 요청·모르는 말이면 false
  understood: z.boolean(),
  // 타입 이름 (expense, review, workout, body, routine). 특정할 수 없으면 null
  type: z.string().nullable(),
  // 기간 'YYYY-MM-DD' (끝 날짜 포함). 기간이 없는 질문이면 둘 다 null
  from: z.string().nullable(),
  to: z.string().nullable(),
  // 제목·메모·태그·분류에서 찾을 말. 없으면 null
  keyword: z.string().nullable(),
  // 선택 칸 조건: 하나라도 맞으면
  selects: z.array(
    z.object({ field: z.string(), values: z.array(z.string()) }),
  ),
  // 숫자 칸 조건: 끝 값 포함, 한쪽만 있어도 된다
  ranges: z.array(
    z.object({
      field: z.string(),
      min: z.number().nullable(),
      max: z.number().nullable(),
    }),
  ),
  // 별점 n점 이상 (후기)
  ratingMin: z.number().nullable(),
});
export type NakiAiOutput = z.infer<typeof nakiAiOutputSchema>;

// ── AI에 보낼 것: 필드 정의만 ──────────────────────────

// 칸 하나의 정의 (이름·종류·단위·기본 선택지). 사용자가 직접 입력한 선택지와 기록 내용은 보내지 않는다 (CLAUDE.md, README 6)
export type NakiFieldDescription = {
  name: string;
  label: string;
  kind: FieldFilter['kind'];
  unit?: string;
  options?: readonly string[];
};

export type NakiTypeDescription = {
  type: RecordType;
  label: string;
  fields: NakiFieldDescription[];
};

export function describeTypesForAi(
  types: readonly RecordType[],
): NakiTypeDescription[] {
  return types.map((type) => ({
    type,
    label: RECORD_TYPE_CONFIG[type].label,
    fields: getFilterFields(type).map(({ def, kind }) => ({
      name: def.name,
      label: def.label,
      kind,
      ...(def.unit ? { unit: def.unit } : {}),
      ...(def.options ? { options: def.options } : {}),
    })),
  }));
}

// 시스템 지시. 날짜 계산은 AI에 맡기되 기준(오늘·주 시작 요일)을 정해 준다: 앱의 "이번 주"는 일요일 시작 (calendar.ts)
export function buildNakiInstructions(
  today: string,
  types: readonly NakiTypeDescription[],
): string {
  return [
    '너는 개인 기록 앱 nanaki의 검색 도우미다. 사용자의 질문을 기록 검색 조건으로만 바꾼다.',
    '기록 내용은 모른다. 답을 짐작해 말하지 말고 조건만 만든다.',
    `오늘은 ${formatDisplayDate(today)}이다. 날짜는 'YYYY-MM-DD'로, 끝 날짜를 포함한다. 한 주는 일요일에 시작한다.`,
    '"지난달"은 지난달 1일부터 말일까지, "이번 달"은 이번 달 1일부터 말일까지, "올해"는 1월 1일부터 12월 31일까지다.',
    'type과 field는 아래 목록에 있는 이름만 쓴다. 선택 칸 값은 사용자가 말한 말을 그대로 쓰되, 기본 선택지에 같은 뜻이 있으면 그것을 쓴다.',
    '금액은 원 단위 정수다. 질문이 기록 찾기·세기·합계가 아니면 understood를 false로 한다.',
    `기록 타입과 칸: ${JSON.stringify(types)}`,
  ].join('\n');
}

// ── AI 답 → 검색 조건 (믿지 않고 거른다) ────────────────

const MAX_SELECT_VALUES = 5;
// 칸 값 글자 상한 (분류·종목은 12자). 넉넉히 두되 끝없이 받지 않게
const MAX_SELECT_VALUE_LENGTH = 20;
const MIN_RATING = 1;
const MAX_RATING = 5;

function cleanValues(values: readonly string[]): string[] {
  const cleaned = values
    .map((value) => value.trim())
    .filter((value) => value !== '' && value.length <= MAX_SELECT_VALUE_LENGTH);
  return [...new Set(cleaned)].slice(0, MAX_SELECT_VALUES);
}

function cleanNumber(
  value: number | null,
  max: number | undefined,
): number | null {
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  if (max !== undefined && value > max) return null;
  return Math.round(value);
}

// 고른 타입의 칸 중 AI가 말한 것만, 그 칸의 연산자로만. 목록에 없는 칸·다른 연산자는 버린다
function toFieldFilters(output: NakiAiOutput, type: RecordType): FieldFilters {
  const filters: FieldFilters = {};
  for (const { def, kind } of getFilterFields(type)) {
    if (kind === 'select') {
      const select = output.selects.find((item) => item.field === def.name);
      const values = select ? cleanValues(select.values) : [];
      if (values.length > 0) filters[def.name] = { kind: 'select', values };
    } else if (kind === 'range') {
      const range = output.ranges.find((item) => item.field === def.name);
      const max = (def as { max?: number }).max;
      const min = range ? cleanNumber(range.min, max) : null;
      const top = range ? cleanNumber(range.max, max) : null;
      if (min !== null || top !== null) {
        filters[def.name] =
          min !== null && top !== null && min > top
            ? { kind: 'range', min: top, max: min }
            : { kind: 'range', min, max: top };
      }
    } else if (output.ratingMin !== null) {
      const min = Math.round(output.ratingMin);
      if (min >= MIN_RATING && min <= MAX_RATING) {
        filters[def.name] = { kind: 'rating', min };
      }
    }
  }
  return filters;
}

// AI 답을 검색 조건으로. 이해하지 못했거나 찾을 조건이 하나도 남지 않으면 null ("잘 이해하지 못했어요")
export function toSearchState(
  output: NakiAiOutput,
  visibleTypes: readonly RecordType[],
): SearchState | null {
  if (!output.understood) return null;
  const type = visibleTypes.find((item) => item === output.type) ?? null;
  const hasPeriod = isDateString(output.from) && isDateString(output.to);
  const period = hasPeriod
    ? output.from! <= output.to!
      ? { kind: 'custom' as const, from: output.from!, to: output.to! }
      : { kind: 'custom' as const, from: output.to!, to: output.from! }
    : null;
  const keyword = (output.keyword ?? '')
    .trim()
    .slice(0, MAX_SEARCH_KEYWORD_LENGTH);
  const state: SearchState = {
    ...EMPTY_SEARCH_STATE,
    keyword,
    type,
    period,
    fields: type ? toFieldFilters(output, type) : {},
  };
  const hasCondition =
    state.type !== null || state.period !== null || state.keyword !== '';
  return hasCondition ? state : null;
}
