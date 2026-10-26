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
import { getMetricFields } from './nakiAggregate';
import type { NakiPrevious } from './nakiApi';
import { EMPTY_CUSTOM_NAMES, type NakiCustomNames } from './nakiCustomNames';

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
  // 34e 집계: 무엇을 계산할지 (list·sum·count·avg·max·min)와 계산할 숫자 칸 이름.
  // 문자열로 받고 nakiAggregate.toNakiAggregate가 거른다 (enum으로 막으면 모르는 값 하나에 답 전체가 버려진다)
  intent: z.string().nullable(),
  metric: z.string().nullable(),
});
export type NakiAiOutput = z.infer<typeof nakiAiOutputSchema>;

// ── AI에 보낼 것: 필드 정의만 ──────────────────────────

// 칸 하나의 정의 (이름·종류·단위·기본 선택지 + 사용자가 만든 선택지 이름). 기록 내용은 보내지 않는다 (CLAUDE.md, README 6).
// 사용자 선택지는 2026-10-23부터 보낸다 (사용자 결정, nakiCustomNames). 기본 선택지와 나눠 둬 AI가 둘을 구분하게
export type NakiFieldDescription = {
  name: string;
  label: string;
  kind: FieldFilter['kind'];
  unit?: string;
  options?: readonly string[];
  userOptions?: readonly string[];
};

export type NakiTypeDescription = {
  type: RecordType;
  label: string;
  fields: NakiFieldDescription[];
  // 계산할 수 있는 숫자 칸 (거르기 칸과 다르다: 체중·거리는 필터 칸이 아니어도 평균·최저를 묻는다)
  metrics: { name: string; label: string; unit?: string }[];
};

export function describeTypesForAi(
  types: readonly RecordType[],
  customNames: NakiCustomNames = EMPTY_CUSTOM_NAMES,
): NakiTypeDescription[] {
  return types.map((type) => ({
    type,
    label: RECORD_TYPE_CONFIG[type].label,
    fields: getFilterFields(type).map(({ def, kind }) => {
      // 켜진 타입의 직접 입력 칸에 맞는 이름만 쓴다 (요청이 보낸 타입·칸 이름은 믿지 않고 여기서 맞춰 본다)
      const userOptions = def.allowCustom
        ? customNames.fields.find(
            (item) => item.type === type && item.field === def.name,
          )?.values
        : undefined;
      return {
        name: def.name,
        label: def.label,
        kind,
        ...(def.unit ? { unit: def.unit } : {}),
        ...(def.options ? { options: def.options } : {}),
        ...(userOptions?.length ? { userOptions } : {}),
      };
    }),
    metrics: getMetricFields(type).map(({ name, label, unit }) => ({
      name,
      label,
      ...(unit ? { unit } : {}),
    })),
  }));
}

// ── 이어 묻기: 앞 조건을 AI 답과 같은 모양으로 ─────────────

type AiConditions = Pick<
  NakiAiOutput,
  | 'type'
  | 'from'
  | 'to'
  | 'keyword'
  | 'selects'
  | 'ranges'
  | 'ratingMin'
  | 'intent'
  | 'metric'
>;

// 앞 질문의 조건(SearchState)을 AI 답과 같은 모양으로 되돌린다: AI가 그 모양을 그대로 고쳐 쓰면 되도록.
// 화면이 보낸 값이라 칸 조건은 모양을 하나씩 확인하고 모르는 것은 뺀다 (어차피 새 답은 toSearchState가 다시 거른다)
export function toPreviousConditions(previous: NakiPrevious): AiConditions {
  const { state, aggregate } = previous;
  const selects: AiConditions['selects'] = [];
  const ranges: AiConditions['ranges'] = [];
  let ratingMin: number | null = null;
  for (const [field, filter] of Object.entries(state.fields)) {
    if (!filter || typeof filter !== 'object' || !('kind' in filter)) continue;
    const value = filter as {
      kind: unknown;
      values?: unknown;
      min?: unknown;
      max?: unknown;
    };
    if (value.kind === 'select' && Array.isArray(value.values)) {
      selects.push({
        field,
        values: value.values.filter(
          (item): item is string => typeof item === 'string',
        ),
      });
    } else if (value.kind === 'range') {
      ranges.push({
        field,
        min: typeof value.min === 'number' ? value.min : null,
        max: typeof value.max === 'number' ? value.max : null,
      });
    } else if (value.kind === 'rating' && typeof value.min === 'number') {
      ratingMin = value.min;
    }
  }
  return {
    type: state.type,
    // 프리셋(이번 주 등)은 날짜로 풀지 않고 비운다: 나키 답은 늘 날짜(custom)라 화면에서만 생기는 경우다
    from: state.period?.kind === 'custom' ? state.period.from : null,
    to: state.period?.kind === 'custom' ? state.period.to : null,
    keyword: state.keyword || null,
    selects,
    ranges,
    ratingMin,
    intent: aggregate.intent,
    metric: aggregate.field,
  };
}

// 시스템 지시. 날짜 계산은 AI에 맡기되 기준(오늘·주 시작 요일)을 정해 준다: 앱의 "이번 주"는 일요일 시작 (calendar.ts)
export function buildNakiInstructions(
  today: string,
  types: readonly NakiTypeDescription[],
  tags: readonly string[] = [],
  previous?: NakiPrevious,
): string {
  return [
    '너는 개인 기록 앱 nanaki의 검색 도우미다. 사용자의 질문을 기록 검색 조건으로만 바꾼다.',
    '기록 내용은 모른다. 답을 짐작해 말하지 말고 조건만 만든다.',
    `오늘은 ${formatDisplayDate(today)}이다. 날짜는 'YYYY-MM-DD'로, 끝 날짜를 포함한다. 한 주는 일요일에 시작한다.`,
    '"지난달"은 지난달 1일부터 말일까지, "이번 달"은 이번 달 1일부터 말일까지, "올해"는 1월 1일부터 12월 31일까지다.',
    'type과 field는 아래 목록에 있는 이름만 쓴다.',
    // userOptions = 사용자가 직접 만든 선택지 이름(예: Ott, 2026-10-23부터 보냄). 같은 말이면 그 값을 칸 조건으로 (비교는 대소문자 무시, searchFilters).
    // 어느 선택지에도 없는 말은 keyword: 칸 조건은 그 칸만 보지만 keyword는 제목·메모·태그·분류를 다 찾아 놓치지 않는다
    '말이 기본 선택지(options)나 사용자 선택지(userOptions) 하나와 같거나 그에 속하면 그 값을 선택 칸 조건으로 쓴다 (예: 외식비·점심값 → 분류 식비, 헬스장 → 종목 헬스, userOptions에 Ott가 있으면 OTT → 분류 Ott). 어느 선택지에도 속하지 않는 말은 keyword로 넣는다. keyword는 제목·메모·태그·분류를 모두 찾는다.',
    // 실제 모델 시험(2026-10-23, gemini-3.5-flash-lite)에서 "외식비"를 분류 식비 + 검색어 "외식"으로 겹쳐 넣어,
    // 제목에 "외식"이 없는 식비 기록이 빠졌다. 칸 조건으로 나타낸 말은 검색어에 다시 넣지 말라고 정해 준다
    '칸 조건(타입·분류 같은 선택 칸)으로 나타낸 말은 keyword에 다시 넣지 않는다. keyword는 칸으로 나타낼 수 없는 이름(가게·상품·장소 이름 등)일 때만 쓴다.',
    '금액은 원 단위 정수다.',
    // 2026-10-23 실제 모델 시험: "내가 구독중인 Ott는?"을 기록 찾기가 아닌 질문으로 보고 understood=false를 냈다
    '"내가 구독 중인 ○○는?", "○○ 뭐 있어?", "○○ 언제 했지?"처럼 사용자가 자기 지출·활동·물건을 묻는 질문은 모두 기록 찾기다.',
    '인사·조언·일반 지식처럼 사용자의 기록과 상관없는 질문만 understood를 false로 한다.',
    // 34e 집계: AI는 계산 종류와 칸만 고르고, 계산은 앱이 한다. 기본은 list
    'intent는 질문이 원하는 계산이다: 기록을 보여 달라면 list, 얼마·총·합계면 sum, 몇 번·몇 개·몇 건이면 count, 평균이면 avg, 가장 큰·제일 많은·최고·최대면 max, 가장 작은·제일 낮은·최저·최소면 min. 애매하면 list.',
    'sum·avg·max·min이면 metric에 그 타입 metrics의 name을 쓴다 (예: 체중 → weight, 운동 시간 → minutes, 거리 → distance, 지출 → amount). 그 밖에는 metric을 null로 한다.',
    `기록 타입과 칸: ${JSON.stringify(types)}`,
    // 태그는 칸이 아니라 검색어로 찾는다 (matchesKeyword가 태그를 하나씩 비교한다)
    ...(tags.length > 0
      ? [
          `사용자 태그: ${JSON.stringify(tags)}. 질문의 말이 태그와 같으면 그 태그를 keyword로 넣는다.`,
        ]
      : []),
    // 이어 묻기 (2026-10-26): "그럼 지난달은?"처럼 무엇을 찾는지가 빠진 질문은 앞 조건에서 바뀐 것만 바꾼다.
    // 새 질문인데 앞 조건을 끌고 오면 엉뚱한 결과가 되므로 "이어지지 않으면 무시"를 같이 정해 준다
    ...(previous
      ? [
          `바로 앞 질문: ${JSON.stringify(previous.question)}`,
          `앞 질문으로 만든 조건: ${JSON.stringify(toPreviousConditions(previous))}`,
          '이번 질문이 앞 질문에 이어지는 말이면(그럼·거기서·그중·그건·"지난달은?"처럼 무엇을 찾는지가 빠진 질문) 앞 조건을 이어받아 이번 질문이 바꾸는 것만 바꾼다. 무엇을 찾는지 스스로 말하는 새 질문이면 앞 조건은 무시한다.',
        ]
      : []),
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
