import type { FieldDef } from '@/features/records/schema/fieldKinds';
import { RATING_MAX, RATING_MIN } from '@/features/records/schema/fieldKinds';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import {
  RECORD_TYPE_CONFIG,
  type RecordType,
} from '@/features/records/schema/recordTypes';
import {
  addMonthsTo,
  endOfWeekOf,
  isDateString,
  startOfWeekOf,
} from '@/shared/date/calendar';
import { formatShortDate } from '@/shared/date/formatDisplayDate';
import { getMonthRangeOf, toMonthString } from '@/shared/date/month';
import type { DateRange } from '@/shared/date/monthRange';
import { removeWhitespace } from '@/shared/text/removeWhitespace';

// 필터 시트(시안 14b)의 상태와 계산. 화면 없이 테스트할 수 있게 순수 함수로만 둔다.
// 칸 목록·모양은 타입 설정(filterFields)과 필드 정의(kind)에서 만든다 → 컴포넌트에 if (type === 'expense')가 없다

// ── 기간 ──────────────────────────────────────────────

export const PERIOD_PRESETS = ['week', 'month', 'lastMonth'] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const PERIOD_PRESET_LABEL: Record<PeriodPreset, string> = {
  week: '이번 주',
  month: '이번 달',
  lastMonth: '지난달',
};

export type PeriodFilter =
  | { kind: 'preset'; preset: PeriodPreset }
  // 끝 날짜 포함. 한쪽만 고른 상태는 주소에 쓰지 않는다 (시트가 둘 다 고르게 한다)
  | { kind: 'custom'; from: string; to: string };

// 주소 이름: period=week|month|last-month, 직접 고르면 from·to
const PERIOD_PARAM: Record<PeriodPreset, string> = {
  week: 'week',
  month: 'month',
  lastMonth: 'last-month',
};

export function parsePeriod(
  params: Pick<URLSearchParams, 'get'>,
): PeriodFilter | null {
  const preset = PERIOD_PRESETS.find(
    (key) => PERIOD_PARAM[key] === params.get('period'),
  );
  if (preset) return { kind: 'preset', preset };

  const from = params.get('from');
  const to = params.get('to');
  if (!isDateString(from) || !isDateString(to)) return null;
  // 거꾸로 온 주소(손으로 고친 주소)는 바꿔 끼운다. 비워 버리면 사용자는 왜 필터가 사라졌는지 모른다
  return from <= to
    ? { kind: 'custom', from, to }
    : { kind: 'custom', from: to, to: from };
}

export function writePeriod(
  params: URLSearchParams,
  period: PeriodFilter | null,
): void {
  if (!period) return;
  if (period.kind === 'preset') {
    params.set('period', PERIOD_PARAM[period.preset]);
  } else {
    params.set('from', period.from);
    params.set('to', period.to);
  }
}

// 기간 → 날짜 범위. "이번 주"처럼 오늘 기준인 기간은 오늘을 알아야 한다 (브라우저에서만 안다 → 모르면 null).
// 주는 일요일 시작 (홈 캘린더와 같은 기준, calendar.ts)
export function resolvePeriod(
  period: PeriodFilter,
  today: string | null,
): DateRange | null {
  if (period.kind === 'custom') return { from: period.from, to: period.to };
  if (!today) return null;
  switch (period.preset) {
    case 'week':
      return { from: startOfWeekOf(today), to: endOfWeekOf(today) };
    case 'month':
      return getMonthRangeOf(toMonthString(today));
    case 'lastMonth':
      return getMonthRangeOf(toMonthString(addMonthsTo(today, -1)));
  }
}

export function formatPeriod(period: PeriodFilter): string {
  return period.kind === 'preset'
    ? PERIOD_PRESET_LABEL[period.preset]
    : `${formatShortDate(period.from)} ~ ${formatShortDate(period.to)}`;
}

// ── 칸 필터 ───────────────────────────────────────────

// 필드 정의를 넓게 읽는 모양. 빌더마다 붙은 정보(options·unit·max·maxLength)가 있을 수도 없을 수도 있다
type FilterFieldDef = FieldDef & {
  options?: readonly string[];
  allowCustom?: boolean;
  unit?: string;
  max?: number;
  maxLength?: number;
};

export type FieldFilter =
  // 여러 개 고르기 (2026-10-22 사용자 결정): 하나라도 맞으면
  | { kind: 'select'; values: string[] }
  // 숫자 범위, 한쪽만 있어도 된다 (끝 값 포함)
  | { kind: 'range'; min: number | null; max: number | null }
  // 별점 n점 이상
  | { kind: 'rating'; min: number };

export type FieldFilters = Record<string, FieldFilter>;

// 필터 칸 하나: 필드 정의 + 그 칸이 어떤 필터 모양인지
export type FilterField = {
  def: FilterFieldDef;
  kind: FieldFilter['kind'];
};

// 필드 종류 → 필터 모양. 글자 칸(text)은 검색어가 맡아서 필터가 없다
const FILTER_KIND_OF: Partial<Record<FieldDef['kind'], FieldFilter['kind']>> = {
  select: 'select',
  number: 'range',
  rating: 'rating',
};

// 한 타입의 필터 칸 (시트에 그릴 순서 = 설정 filterFields 순서)
export function getFilterFields(type: RecordType): FilterField[] {
  const defs = RECORD_TYPE_CONFIG[type].fields as readonly FilterFieldDef[];
  return RECORD_TYPE_CONFIG[type].filterFields.flatMap((name) => {
    const def = defs.find((field) => field.name === name);
    const kind = def && FILTER_KIND_OF[def.kind];
    return def && kind ? [{ def, kind }] : [];
  });
}

// 직접 입력이 없는 선택(후기 대상)에도 쓰는 글자 길이 상한. 주소를 손으로 길게 고쳐도 끝없이 받지 않게
const MAX_SELECT_VALUE_LENGTH = 20;

// 주소 이름: 선택 = 칸 이름 반복(category=식비&category=카페), 범위 = amount_min·amount_max, 별점 = rating_min
function readNumber(value: string | null, max: number): number | null {
  if (value === null || value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= max
    ? number
    : null;
}

// 칸 필터는 고른 타입이 있을 때만 읽는다 (칸 이름이 타입마다 다르다). 틀린 값은 버린다
export function parseFieldFilters(
  params: Pick<URLSearchParams, 'get' | 'getAll'>,
  type: RecordType | null,
): FieldFilters {
  if (!type) return {};
  const filters: FieldFilters = {};
  for (const { def, kind } of getFilterFields(type)) {
    if (kind === 'select') {
      const maxLength = def.maxLength ?? MAX_SELECT_VALUE_LENGTH;
      const values = [
        ...new Set(
          params
            .getAll(def.name)
            .map((value) => value.trim())
            .filter((value) => value && value.length <= maxLength)
            // 고정 선택(대상 종류)은 정해진 선택지만
            .filter((value) => def.allowCustom || def.options?.includes(value)),
        ),
      ];
      if (values.length > 0) filters[def.name] = { kind, values };
    } else if (kind === 'range') {
      const max = def.max ?? Number.MAX_SAFE_INTEGER;
      const low = readNumber(params.get(`${def.name}_min`), max);
      const high = readNumber(params.get(`${def.name}_max`), max);
      if (low === null && high === null) continue;
      // 거꾸로 온 범위는 바꿔 끼운다 (기간과 같은 이유)
      filters[def.name] =
        low !== null && high !== null && low > high
          ? { kind, min: high, max: low }
          : { kind, min: low, max: high };
    } else {
      const min = Number(params.get(`${def.name}_min`));
      if (Number.isInteger(min) && min >= RATING_MIN && min <= RATING_MAX) {
        filters[def.name] = { kind, min };
      }
    }
  }
  return filters;
}

export function writeFieldFilters(
  params: URLSearchParams,
  filters: FieldFilters,
): void {
  // 이름 순서를 고정해 같은 필터는 언제나 같은 주소가 되게 (쿼리 키·비교가 쉽다)
  for (const name of Object.keys(filters).sort()) {
    const filter = filters[name];
    if (filter.kind === 'select') {
      for (const value of filter.values) params.append(name, value);
    } else if (filter.kind === 'range') {
      if (filter.min !== null) params.set(`${name}_min`, String(filter.min));
      if (filter.max !== null) params.set(`${name}_max`, String(filter.max));
    } else {
      params.set(`${name}_min`, String(filter.min));
    }
  }
}

// 선택 값 비교용: 대소문자·공백 무시 (검색어 비교와 같은 규칙, searchQuery).
// 필터 시트에서는 선택지를 눌러 고르니 글자가 늘 같지만, 나키(AI)는 사용자가 직접 입력한 분류("Ott")를 모른 채
// 질문의 말("OTT")로 조건을 만든다 (직접 입력값은 AI에 보내지 않는다, CLAUDE.md). 정확히 같은 글자만 맞으면 그 기록이 빠진다
function normalizeSelectValue(value: string): string {
  return removeWhitespace(value).toLowerCase();
}

// 기록 하나가 칸 필터를 모두 통과하는지. 그 칸이 비어 있는 기록(결제수단을 안 쓴 가계부)은 그 칸 필터에서 빠진다
export function matchesFieldFilters(
  entry: RecordEntry,
  filters: FieldFilters,
): boolean {
  const fields = entry.fields as Record<string, unknown>;
  return Object.entries(filters).every(([name, filter]) => {
    const value = fields[name];
    if (filter.kind === 'select') {
      if (typeof value !== 'string') return false;
      const target = normalizeSelectValue(value);
      return filter.values.some(
        (selected) => normalizeSelectValue(selected) === target,
      );
    }
    if (typeof value !== 'number') return false;
    if (filter.kind === 'rating') return value >= filter.min;
    return (
      (filter.min === null || value >= filter.min) &&
      (filter.max === null || value <= filter.max)
    );
  });
}

// 칸 필터는 고른 타입의 기록에만 건다. 다른 타입 기록은 그대로 둬서 타입 칩 건수(후기 3)가 칸 필터에 흔들리지 않는다
export function applyFieldFilters(
  entries: readonly RecordEntry[],
  type: RecordType | null,
  filters: FieldFilters,
): RecordEntry[] {
  return entries.filter(
    (entry) =>
      !type || entry.type !== type || matchesFieldFilters(entry, filters),
  );
}

// 선택 칸의 선택지: 기본 선택지 + 받은 결과에 있는 직접 입력값 (2026-10-22 사용자 결정).
// 이미 고른 값도 넣는다: 결과에 없어도(다른 검색어로 바꾼 뒤) 시트에서 풀 수 있어야 한다
export function getSelectOptions(
  def: FilterFieldDef,
  entries: readonly RecordEntry[],
  selected: readonly string[],
): string[] {
  const base = def.options ?? [];
  if (!def.allowCustom) return [...base];
  const custom = entries
    .map((entry) => (entry.fields as Record<string, unknown>)[def.name])
    .filter((value): value is string => typeof value === 'string');
  return [...new Set([...base, ...selected, ...custom])];
}

// ── 적용된 조건 칩 ────────────────────────────────────

export type AppliedFilter = {
  // 칩을 지울 때 쓰는 이름: 'period' 또는 칸 이름
  id: string;
  label: string;
  value: string;
};

function formatNumber(value: number, unit: string): string {
  return `${value.toLocaleString('ko-KR')}${unit}`;
}

function formatFieldFilter(def: FilterFieldDef, filter: FieldFilter): string {
  const unit = def.unit ?? '';
  if (filter.kind === 'select') {
    // 여러 개면 "식비 외 1" (칩이 길어져 줄을 넘치지 않게)
    return filter.values.length > 1
      ? `${filter.values[0]} 외 ${filter.values.length - 1}`
      : filter.values[0];
  }
  if (filter.kind === 'rating') return `${filter.min}점 이상`;
  if (filter.min !== null && filter.max !== null) {
    return `${formatNumber(filter.min, unit)} ~ ${formatNumber(filter.max, unit)}`;
  }
  return filter.min !== null
    ? `${formatNumber(filter.min, unit)} 이상`
    : `${formatNumber(filter.max ?? 0, unit)} 이하`;
}

// 결과 위에 남기는 칩 목록 (시안 14a: "기간 이번 달 ×", "분류 카페 ×"). 순서는 기간 → 시트의 칸 순서
export function describeFilters(
  type: RecordType | null,
  period: PeriodFilter | null,
  fields: FieldFilters,
): AppliedFilter[] {
  const applied: AppliedFilter[] = [];
  if (period) {
    applied.push({ id: 'period', label: '기간', value: formatPeriod(period) });
  }
  if (type) {
    for (const { def } of getFilterFields(type)) {
      const filter = fields[def.name];
      if (filter) {
        applied.push({
          id: def.name,
          label: def.label,
          value: formatFieldFilter(def, filter),
        });
      }
    }
  }
  return applied;
}
