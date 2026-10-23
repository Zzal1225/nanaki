'use client';

// 'use client' 이유: 조건으로 기기 사본을 찾고(검색과 같은 길), 오늘·켜진 타입을 브라우저에서 안다
import { ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useSearchRecords } from '@/features/records/hooks/useSearchRecords';
import { usePendingRecordIds } from '@/features/records/hooks/usePendingRecordIds';
import RecentRecordItem from '@/features/records/overview/RecentRecordItem';
import { recordViewHref } from '@/features/records/routes/recordRoutes';
import { RECORD_TYPE_CONFIG } from '@/features/records/schema/recordTypes';
import {
  getListTitle,
  getListValue,
} from '@/features/records/ui/recordPresentation';
import { RECORD_TYPE_STYLE } from '@/features/records/ui/recordTypeStyle';
import {
  applyFieldFilters,
  describeFilters,
  resolvePeriod,
  type PeriodFilter,
} from '@/features/search/searchFilters';
import { filterByType } from '@/features/search/searchResults';
import {
  toSearchHref,
  toSearchParams,
  type SearchState,
} from '@/features/search/searchState';
import { useVisibleTypes } from '@/features/settings/hooks/useUserSettings';
import { formatShortDate } from '@/shared/date/formatDisplayDate';
import {
  formatYearMonthLabel,
  getMonthRangeOf,
  toMonthString,
} from '@/shared/date/month';
import { useToday } from '@/shared/date/useToday';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import type { NakiAggregate } from '../nakiAggregate';
import {
  formatNakiSummary,
  orderForPreview,
  summarizeNakiResults,
} from '../nakiSummary';

// 답 안에 바로 보여 줄 기록 수 (2026-10-23 사용자 결정: 대화가 길어지지 않게 3개 + 기록 탭에서 모두 보기)
const PREVIEW_COUNT = 3;

type NakiAnswerProps = {
  state: SearchState;
  // 무엇을 계산할지 (34e, 서버가 거름). 계산은 여기서 찾은 기록으로 한다
  aggregate: NakiAggregate;
};

// 기간 칩 글자. 한 달 전체면 "2026년 9월"(시안), 아니면 검색 칩과 같은 "09.01 (화) ~ 09.15 (화)"
function formatNakiPeriod(period: PeriodFilter, fallback: string): string {
  if (period.kind !== 'custom') return fallback;
  const month = toMonthString(period.from);
  const range = getMonthRangeOf(month);
  return range.from === period.from && range.to === period.to
    ? formatYearMonthLabel(month)
    : fallback;
}

// 나키의 답 하나 (시안 AI): "이렇게 이해했어요" 칩 → 우리가 계산한 한 줄 → 기록 3개 → 기록 탭에서 모두 보기.
// 칩이 핵심이다: AI가 질문을 잘못 이해했으면 사용자가 칩을 보고 바로 알아챈다 (결과만 보여 주면 틀린 것을 모른다)
export default function NakiAnswer({ state, aggregate }: NakiAnswerProps) {
  const today = useToday();
  const visibleTypes = useVisibleTypes();
  const pendingIds = usePendingRecordIds();
  const range = state.period ? resolvePeriod(state.period, today) : null;
  const search = useSearchRecords({
    keyword: state.keyword,
    sort: state.sort,
    range,
  });
  const results = filterByType(
    applyFieldFilters(search.data?.entries ?? [], state.type, state.fields),
    state.type,
    visibleTypes,
  );
  const summary = summarizeNakiResults(results, state.type, aggregate);
  // 최고·최저면 그 기록을 맨 위에 (답의 근거를 바로 보이게)
  const preview = orderForPreview(results, summary).slice(0, PREVIEW_COUNT);
  const typeStyle = state.type ? RECORD_TYPE_STYLE[state.type] : null;
  const conditionChips = [
    ...describeFilters(state.type, state.period, state.fields).map((chip) =>
      chip.id === 'period' && state.period
        ? { ...chip, value: formatNakiPeriod(state.period, chip.value) }
        : chip,
    ),
    ...(state.keyword
      ? [{ id: 'keyword', label: '검색어', value: state.keyword }]
      : []),
  ];
  // 상세 주소에 조건을 달고 간다: 상세의 뒤로가 이 조건의 검색 결과로 돌아온다 (detailOrigin)
  const detailQuery = toSearchParams(state);

  return (
    <div className='flex flex-col gap-3 pt-1.5'>
      <div className='flex flex-col gap-2'>
        <span className='flex items-center gap-1 text-caption font-semibold text-accent'>
          <Sparkles
            aria-hidden='true'
            size={14}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          이렇게 이해했어요
        </span>
        {/* 칩 모양은 시안 AI (2026-10-23 사용자 결정): 타입은 그 타입의 색·아이콘으로 다른 조건과 한눈에 갈라 보이게,
            나머지는 흰 바탕 + 초록 테두리. 기간은 값만 봐도 기간이라 이름표를 숨긴다(sr-only: 화면 읽기 프로그램에는 읽힌다) */}
        <ul aria-label='찾은 조건' className='flex flex-wrap gap-2'>
          {state.type && typeStyle && (
            <li
              className={`inline-flex h-7 items-center gap-1 rounded-full pr-3 pl-2 text-caption font-semibold ${typeStyle.subtleBgClass} ${typeStyle.textClass}`}
            >
              <typeStyle.icon
                aria-hidden='true'
                size={14}
                strokeWidth={ICON_STROKE_WIDTH}
              />
              <span className='sr-only'>타입</span>
              {RECORD_TYPE_CONFIG[state.type].label}
            </li>
          )}
          {conditionChips.map((chip) => (
            <li
              key={chip.id}
              className='inline-flex h-7 items-center gap-1 rounded-full border border-accent bg-surface px-3 text-caption text-fg-primary tabular-nums'
            >
              <span
                className={
                  chip.id === 'period' ? 'sr-only' : 'text-fg-secondary'
                }
              >
                {chip.label}
              </span>
              <span className='font-semibold'>{chip.value}</span>
            </li>
          ))}
        </ul>
      </div>

      {search.isPending ? (
        <div
          aria-busy='true'
          className='h-6 animate-pulse rounded-md bg-surface-hover'
        />
      ) : search.isError ? (
        <p role='alert' className='text-body-sm text-fg-primary'>
          기록을 불러오지 못했어요. 기록 탭에서 다시 찾아 주세요.
        </p>
      ) : (
        <>
          <p className='text-body font-semibold text-fg-primary tabular-nums'>
            {formatNakiSummary(summary)}
            {/* 검색은 한 번에 최근 300건까지 본다. 넘으면 합계가 일부 기록 기준이라는 것을 숨기지 않는다 */}
            {search.data?.isTruncated && (
              <span className='ml-1 text-caption font-medium text-fg-secondary'>
                (최근 기록 일부만 셌어요)
              </span>
            )}
          </p>
          {results.length > 0 && (
            <ul className='flex flex-col gap-2'>
              {preview.map((entry) => (
                <li key={entry.id}>
                  <RecentRecordItem
                    type={entry.type}
                    title={getListTitle(entry)}
                    subtitle={`${RECORD_TYPE_CONFIG[entry.type].label} · ${formatShortDate(entry.occurredAt)}`}
                    value={getListValue(entry)}
                    href={recordViewHref(entry.id, detailQuery)}
                    isPending={pendingIds.has(entry.id)}
                    isSelected={false}
                    highlight={state.keyword}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* 검색 화면에서 같은 조건으로 (필터·정렬을 이어서 고칠 수 있다). AI 결과를 검색 기능으로 넘기는 다리 */}
      <Link
        href={toSearchHref(state)}
        className='-mx-2 flex min-h-11 items-center gap-1 rounded-md px-2 text-body-sm font-semibold text-accent hover:bg-surface-hover active:bg-surface-pressed'
      >
        <span className='flex-1'>
          기록 탭에서 이 조건으로 보기
          {!search.isPending && results.length > 0
            ? ` · ${results.length}건`
            : ''}
        </span>
        <ChevronRight
          aria-hidden='true'
          size={ICON_SIZE.sm}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </Link>
    </div>
  );
}
