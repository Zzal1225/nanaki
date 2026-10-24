import { differenceInCalendarDays } from 'date-fns';
import type { RecordEntryOf } from '@/features/records/schema/recordEntry';
import {
  BODY_MEASURE_LABEL,
  BODY_MEASURE_UNIT,
  type BodyMeasure,
} from '@/features/records/schema/body';
import type { PhotoKind } from '@/features/records/schema/photoKinds';
import {
  formatMeasurement,
  roundToOneDecimal,
} from '@/features/records/ui/recordPresentation';
import { fromLocalDateString } from '@/shared/date/toLocalDateString';

// 눈바디 비교 (step4 37d) 계산: 주소 읽기·기본 날짜·두 날짜의 체중·허리둘레 변화. 판단은 순수 함수로 두고 테스트한다

type BodyEntry = RecordEntryOf<'body'>;

// 비교할 수 있는 자세 (정면·측면). 후기 사진(38)은 비교하지 않는다
export const COMPARE_KINDS = [
  'front',
  'side',
] as const satisfies readonly PhotoKind[];
export type CompareKind = (typeof COMPARE_KINDS)[number];

export const BODY_COMPARE_PATH = '/body-compare';

export type CompareSelection = { kind: CompareKind; from: string; to: string };

// 주소는 여기서만 만든다 (recordRoutes·budgetRoutes와 같은 규칙). 날짜를 빼면 화면이 기본(처음 사진 → 최근 사진)을 고른다
export function bodyCompareHref(selection: {
  kind?: CompareKind;
  from?: string;
  to?: string;
}): string {
  const params = new URLSearchParams();
  if (selection.kind) params.set('kind', selection.kind);
  if (selection.from) params.set('from', selection.from);
  if (selection.to) params.set('to', selection.to);
  const query = params.toString();
  return query ? `${BODY_COMPARE_PATH}?${query}` : BODY_COMPARE_PATH;
}

export function parseCompareKind(value: string | null): CompareKind {
  return value === 'side' ? 'side' : 'front';
}

// 주소의 날짜를 "사진이 있는 날짜" 안에서만 받는다. 없거나 틀리면 기본: 처음 사진 → 최근 사진 (2026-10-24 사용자 결정, 전체 변화).
// 두 날짜가 거꾸로면 바로잡는다 (왼쪽 = 앞 날짜). 사진 날짜가 2개 미만이면 비교할 수 없다 → null
export function resolveCompareDates(
  photoDates: readonly string[],
  requested: { from: string | null; to: string | null },
): { from: string; to: string } | null {
  const dates = [...new Set(photoDates)].sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (dates.length < 2 || !first || !last) return null;
  const from =
    requested.from && dates.includes(requested.from) ? requested.from : first;
  let to = requested.to && dates.includes(requested.to) ? requested.to : last;
  // 같은 날을 둘 다 고르면 비교가 안 된다 → 뒤 날짜를 그 다음 사진 날짜(없으면 앞 날짜)로
  if (to === from) {
    const after = dates.find((date) => date > from);
    if (after) to = after;
    else return { from: dates[dates.length - 2] ?? first, to: from };
  }
  return from < to ? { from, to } : { from: to, to: from };
}

export type NearestMeasure = { value: number; date: string };

// 그 날짜에 가장 가까운(앞뒤 상관없이) 그 항목 기록. 같은 거리면 앞 날짜 (그날까지 알던 값).
// 눈바디를 찍은 날 체중을 재지 않았을 수도 있어서 "그날 기록"만 보면 수치가 자주 빈다
export function nearestMeasure(
  entries: readonly BodyEntry[],
  date: string,
  measure: BodyMeasure,
): NearestMeasure | null {
  let best: NearestMeasure | null = null;
  let bestDistance = Infinity;
  for (const entry of entries) {
    const value = entry.fields[measure];
    if (value === undefined) continue;
    const distance = Math.abs(daysBetween(entry.occurredAt, date));
    const isCloser =
      distance < bestDistance ||
      (distance === bestDistance &&
        best !== null &&
        entry.occurredAt < best.date);
    if (isCloser) {
      best = { value, date: entry.occurredAt };
      bestDistance = distance;
    }
  }
  return best;
}

export type MeasureDiff = {
  measure: BodyMeasure;
  label: string;
  before: string | null;
  after: string | null;
  // 둘 다 있을 때만. "-1.2kg" / "+0.5cm" / "0kg"
  change: string | null;
  changeValue: number | null;
};

// 두 날짜의 체중·허리둘레 변화 (시안 20·P6d 표). 한 번도 잰 적 없는 항목은 줄을 그리지 않는다
export function measureDiffs(
  entries: readonly BodyEntry[],
  from: string,
  to: string,
): MeasureDiff[] {
  const measures: BodyMeasure[] = ['weight', 'waist'];
  return measures.flatMap((measure) => {
    const before = nearestMeasure(entries, from, measure);
    const after = nearestMeasure(entries, to, measure);
    if (!before && !after) return [];
    const unit = BODY_MEASURE_UNIT[measure];
    const changeValue =
      before && after ? roundToOneDecimal(after.value - before.value) : null;
    return [
      {
        measure,
        label: BODY_MEASURE_LABEL[measure],
        before: before ? formatMeasurement(before.value, unit) : null,
        after: after ? formatMeasurement(after.value, unit) : null,
        change: changeValue === null ? null : formatChange(changeValue, unit),
        changeValue,
      },
    ];
  });
}

// 늘고 준 것을 색으로 칠하지 않는다 (체중이 준 게 늘 좋은 건 아니다, 기록 탭 비교와 같은 원칙)
function formatChange(value: number, unit: string): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatMeasurement(value, unit)}`;
}

// 'YYYY-MM-DD' 두 개 사이 날 수 (뒤 - 앞). new Date('YYYY-MM-DD')는 UTC로 읽혀 하루 밀릴 수 있어 로컬 날짜로 만든다
export function daysBetween(from: string, to: string): number {
  return differenceInCalendarDays(
    fromLocalDateString(to),
    fromLocalDateString(from),
  );
}

// 비교 손잡이 위치 (0 = 뒤 날짜만, 100 = 앞 날짜만, 왼쪽이 앞 날짜). 위치 버튼 3개와 방향키 한 칸
export const POSITION_BEFORE_ONLY = 100;
export const POSITION_HALF = 50;
export const POSITION_AFTER_ONLY = 0;
export const POSITION_STEP = 5;

export function clampPosition(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

// 날짜마다 사진 하나 (같은 날 기록이 둘이면 나중에 쓴 기록: 조회가 날짜·만든 시각 오름차순이라 뒤의 것이 덮어쓴다)
export function pickPhotoByDate<T extends { date: string }>(
  list: readonly T[],
): Map<string, T> {
  const byDate = new Map<string, T>();
  for (const item of list) byDate.set(item.date, item);
  return byDate;
}
