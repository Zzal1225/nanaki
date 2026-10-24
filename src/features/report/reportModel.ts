import {
  RECORD_TYPE_CONFIG,
  type RecordType,
} from '@/features/records/schema/recordTypes';
import type {
  RecordEntry,
  RecordEntryOf,
} from '@/features/records/schema/recordEntry';
import { isDateString } from '@/shared/date/calendar';
import { formatMonthDotDay } from '@/shared/date/formatDisplayDate';
import {
  getMonthRangeOf,
  shiftMonth,
  toMonthString,
} from '@/shared/date/month';
import type { DateRange } from '@/shared/date/monthRange';

// 보고서 (step4 40, 시안 21) 계산: 기간·주소·제목·타입별 개수·운동 묶음·별점 높은 후기. 순수 함수로 두고 테스트한다.
// 사진은 넣지 않는다 (CLAUDE.md: 몸 사진은 AI·보고서에 넣지 않음. 후기 사진도 기록 내용만으로 충분해 같이 뺀다)

export const REPORT_PATH = '/report';

// 타입 순서 = 타입 설정 순서 (기록 탭 카드와 같다)
export const REPORT_TYPES = Object.keys(RECORD_TYPE_CONFIG) as RecordType[];

export type ReportPreset =
  'thisMonth' | 'lastMonth' | 'last3Months' | 'thisYear';

export const REPORT_PRESET_LABEL: Record<ReportPreset, string> = {
  thisMonth: '이번 달',
  lastMonth: '지난달',
  last3Months: '최근 3개월',
  thisYear: '올해',
};

// 기간 칩 (시안 21a). 이번 달은 1일~말일 전체: 보고서 제목이 "10월 보고서"가 되게. 아직 오지 않은 날은 기록이 없을 뿐이다
// (루틴 달성률만 오늘까지로 자른다 — 오지 않은 날을 "안 함"으로 세지 않게, buildRoutineRange)
export function presetRange(preset: ReportPreset, today: string): DateRange {
  const month = toMonthString(today);
  switch (preset) {
    case 'thisMonth':
      return getMonthRangeOf(month);
    case 'lastMonth':
      return getMonthRangeOf(shiftMonth(month, -1));
    case 'last3Months':
      return {
        from: getMonthRangeOf(shiftMonth(month, -2)).from,
        to: getMonthRangeOf(month).to,
      };
    case 'thisYear':
      return {
        from: `${today.slice(0, 4)}-01-01`,
        to: `${today.slice(0, 4)}-12-31`,
      };
  }
}

export type ReportQuery = { from: string; to: string; types: RecordType[] };

// 주소: /report?from=&to=&types=expense,review (새로고침·공유에 남게). 주소는 여기서만 만든다
export function reportHref(query: ReportQuery): string {
  const params = new URLSearchParams({
    from: query.from,
    to: query.to,
    types: query.types.join(','),
  });
  return `${REPORT_PATH}?${params.toString()}`;
}

// 주소를 읽어 결과를 보여 줄 수 있으면 조건, 아니면 null(고르는 화면). 모르는 타입은 버리고, 하나도 없으면 null
export function parseReportQuery(params: {
  from: string | null;
  to: string | null;
  types: string | null;
}): ReportQuery | null {
  const { from, to } = params;
  if (!isDateString(from) || !isDateString(to) || from > to) return null;
  const types = REPORT_TYPES.filter((type) =>
    (params.types ?? '').split(',').includes(type),
  );
  return types.length > 0 ? { from, to, types } : null;
}

// 제목 (시안 "2026년 10월 보고서"): 한 달 전체면 그 달, 한 해 전체면 그 해, 아니면 기간
export function reportTitle(range: DateRange): string {
  const month = toMonthString(range.from);
  const monthRange = getMonthRangeOf(month);
  const [year, monthNumber] = month.split('-');
  if (range.from === monthRange.from && range.to === monthRange.to) {
    return `${year}년 ${Number(monthNumber)}월 보고서`;
  }
  if (range.from === `${year}-01-01` && range.to === `${year}-12-31`) {
    return `${year}년 보고서`;
  }
  return `${formatMonthDotDay(range.from)} – ${formatMonthDotDay(range.to)} 보고서`;
}

// 포함할 기록 목록의 개수 (시안 21a: 가계부 24건 · 운동 12회 · 루틴 19일 · 체형 5회).
// 루틴은 체크한 날 수: 루틴 여러 개를 한 날 체크해도 하루로 센다
export function countLabel(
  type: RecordType,
  entries: readonly RecordEntry[],
): string {
  const ofType = entries.filter((entry) => entry.type === type);
  switch (type) {
    case 'routine':
      return `${new Set(ofType.map((entry) => entry.occurredAt)).size}일`;
    case 'workout':
    case 'body':
      return `${ofType.length}회`;
    default:
      return `${ofType.length}건`;
  }
}

export type WorkoutBucket = { label: string; minutes: number };

// 운동 묶음 (시안 "운동 · 주별 시간"): 한 달 안이면 주(월요일 시작이 아니라 1~7일·8~14일…), 더 길면 달마다.
// 넉 달 넘게 주로 나누면 막대가 너무 가늘어 읽을 수 없다
export function workoutBuckets(
  entries: readonly RecordEntryOf<'workout'>[],
  range: DateRange,
): WorkoutBucket[] {
  const isOneMonth = toMonthString(range.from) === toMonthString(range.to);
  if (isOneMonth) {
    const lastDay = Number(range.to.slice(8));
    const firstDay = Number(range.from.slice(8));
    const buckets: WorkoutBucket[] = [];
    for (let start = firstDay; start <= lastDay; start += 7) {
      const end = Math.min(start + 6, lastDay);
      const minutes = entries
        .filter((entry) => {
          const day = Number(entry.occurredAt.slice(8));
          return day >= start && day <= end;
        })
        .reduce((sum, entry) => sum + entry.fields.minutes, 0);
      buckets.push({ label: `${start}~${end}일`, minutes });
    }
    return buckets;
  }
  const buckets: WorkoutBucket[] = [];
  for (
    let month = toMonthString(range.from);
    month <= toMonthString(range.to);
    month = shiftMonth(month, 1)
  ) {
    const minutes = entries
      .filter((entry) => entry.occurredAt.startsWith(month))
      .reduce((sum, entry) => sum + entry.fields.minutes, 0);
    buckets.push({ label: `${Number(month.slice(5))}월`, minutes });
  }
  return buckets;
}

// 별점 높은 후기 (시안 21c 목록). 같은 별점이면 최근 것. 평균 별점은 내지 않는다
// (2026-10-22 사용자 결정: 대상이 장소·제품·콘텐츠로 제각각이라 한데 모은 평균은 뜻이 약하다)
export function topReviews(
  entries: readonly RecordEntryOf<'review'>[],
  count: number,
): RecordEntryOf<'review'>[] {
  return [...entries]
    .sort(
      (a, b) =>
        b.fields.rating - a.fields.rating ||
        b.occurredAt.localeCompare(a.occurredAt),
    )
    .slice(0, count);
}

// 루틴 달성률을 셀 기간: 보고서 기간에서 오늘 이후를 뺀다 (오지 않은 날을 "안 함"으로 세지 않게). 기간이 통째로 미래면 null
export function routineRange(
  range: DateRange,
  today: string,
): DateRange | null {
  if (range.from > today) return null;
  return { from: range.from, to: range.to < today ? range.to : today };
}

// 한 달짜리 보고서인지 (예산 줄은 달마다 정하는 예산이라 한 달일 때만)
export function singleMonthOf(range: DateRange): string | null {
  const month = toMonthString(range.from);
  const monthRange = getMonthRangeOf(month);
  return range.from === monthRange.from && range.to === monthRange.to
    ? month
    : null;
}
