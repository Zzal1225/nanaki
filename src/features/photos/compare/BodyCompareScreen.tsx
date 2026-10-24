'use client';

// 'use client' 이유: 사진(서명 링크)·체형 기록(기기 사본)·연결 상태를 브라우저에서 읽고, 손잡이·날짜 고르기가 화면 안 상태다
import { ArrowRight, Calendar, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { useRecordsOfType } from '@/features/records/hooks/useRecordsOfType';
import type { RecordEntryOf } from '@/features/records/schema/recordEntry';
import { PHOTO_KIND_LABEL } from '@/features/records/schema/photoKinds';
import {
  formatDisplayDate,
  formatMonthDotDay,
  formatShortDate,
} from '@/shared/date/formatDisplayDate';
import { useOnlineStatus } from '@/shared/network/useOnlineStatus';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import Sheet from '@/shared/ui/Sheet';
import { usePhotoDates, usePhotoUrls } from '../hooks/usePhotos';
import {
  bodyCompareHref,
  COMPARE_KINDS,
  daysBetween,
  measureDiffs,
  pickPhotoByDate,
  POSITION_AFTER_ONLY,
  POSITION_BEFORE_ONLY,
  POSITION_HALF,
  resolveCompareDates,
  type CompareKind,
  type MeasureDiff,
} from './bodyCompare';
import CompareSlider from './CompareSlider';
import DemoBody from './DemoBody';

type BodyCompareScreenProps = {
  kind: CompareKind;
  fromParam: string | null;
  toParam: string | null;
};

// 체형 기록 전부 (가까운 날짜의 체중·허리둘레를 찾으려고). 기기 사본에서 읽어 오프라인에서도 바로 나온다
const ALL_DATES = { from: '0000-01-01', to: '9999-12-31' };
const BODY_TYPE_HREF = '/records/type/body';

// 눈바디 비교 (step4 37d, 시안 20·P6d). 같은 자세의 두 날짜 사진을 겹쳐 손잡이로 비교하고, 그 두 날짜에 가까운 체중·허리둘레 변화를 보여 준다.
// 주소: /body-compare?kind=&from=&to= (새로고침·공유에 남게). 날짜를 안 주면 처음 사진 → 최근 사진 (2026-10-24 사용자 결정).
// 체험 계정이고 사진이 2개 날짜 미만이면 실제 사진 대신 예시 실루엣으로 동작만 보여 준다 (사용자 결정, 시안 20b: 파일을 올리지 않아 정리 걱정이 없다)
export default function BodyCompareScreen({
  kind,
  fromParam,
  toParam,
}: BodyCompareScreenProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const user = useCurrentUser();
  const photoDates = usePhotoDates(kind, isOnline);
  const bodyRecords = useRecordsOfType('body', ALL_DATES);
  const [position, setPosition] = useState(POSITION_HALF);
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);

  const byDate = pickPhotoByDate(photoDates.data ?? []);
  const dates = [...byDate.keys()];
  const resolved = resolveCompareDates(dates, { from: fromParam, to: toParam });
  const before = resolved ? byDate.get(resolved.from) : undefined;
  const after = resolved ? byDate.get(resolved.to) : undefined;
  const urls = usePhotoUrls(
    before && after ? [before.photo.path, after.photo.path] : [],
  );
  const entries = (bodyRecords.data ?? []) as RecordEntryOf<'body'>[];

  // 체험 예시: 사진이 없을 때만, 체험 예시 기록의 처음·마지막 날짜로 동작을 보여 준다
  const isDemo =
    !resolved &&
    user.data?.isAnonymous === true &&
    photoDates.isSuccess &&
    entries.length >= 2;
  const demoDates = isDemo ? demoRange(entries) : null;
  const range = resolved ?? demoDates;

  function go(selection: { kind?: CompareKind; from?: string; to?: string }) {
    // replace: 날짜·자세를 바꿀 때마다 뒤로 가기 기록이 쌓이지 않게 (뒤로 = 비교 화면을 떠나기)
    router.replace(
      bodyCompareHref({
        kind: selection.kind ?? kind,
        from: selection.from ?? range?.from,
        to: selection.to ?? range?.to,
      }),
      { scroll: false },
    );
  }

  const header = (
    <div className='sticky top-0 z-20 flex h-14 items-center gap-1 bg-bg px-1 md:px-3 lg:mt-4'>
      <Link
        href={BODY_TYPE_HREF}
        aria-label='체형 화면으로 돌아가기'
        className='inline-flex size-11 items-center justify-center rounded-md text-fg-primary hover:bg-surface-hover active:bg-surface-pressed'
      >
        <ChevronLeft
          aria-hidden='true'
          size={ICON_SIZE.lg}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </Link>
      <h1 className='ml-1 text-title text-fg-primary'>눈바디 비교</h1>
    </div>
  );

  const notice = !isOnline
    ? '연결되면 눈바디를 비교할 수 있어요'
    : photoDates.isError
      ? '사진을 불러오지 못했어요. 잠시 후 다시 시도해 주세요'
      : photoDates.isSuccess && !range
        ? `${PHOTO_KIND_LABEL[kind]} 사진이 2개 날짜 이상 있어야 비교할 수 있어요`
        : null;

  const kindControl = (
    <SegmentedControl
      aria-label='자세'
      value={kind}
      onValueChange={(value) =>
        // 자세를 바꾸면 그 자세의 사진 날짜가 달라서 날짜는 기본(처음 → 최근)으로 다시 고른다
        router.replace(bodyCompareHref({ kind: value as CompareKind }), {
          scroll: false,
        })
      }
      options={COMPARE_KINDS.map((value) => ({
        value,
        label: PHOTO_KIND_LABEL[value],
      }))}
      className='w-full [&>*]:flex-1'
    />
  );

  if (notice || !range) {
    return (
      <div className='mx-auto flex w-full max-w-xl flex-col gap-4 pb-6 lg:max-w-5xl'>
        {header}
        <div className='flex flex-col gap-4 px-4 md:px-6'>
          {kindControl}
          {notice ? (
            <p className='rounded-lg border border-border bg-surface p-4 text-body-sm text-fg-secondary'>
              {notice}
            </p>
          ) : (
            <div
              aria-busy='true'
              className='aspect-[3/4] w-full animate-pulse rounded-lg bg-surface-hover'
            />
          )}
        </div>
      </div>
    );
  }

  const fromLabel = formatMonthDotDay(range.from);
  const toLabel = formatMonthDotDay(range.to);
  const diffs = measureDiffs(entries, range.from, range.to);
  const beforeUrl = before ? urls.data?.get(before.photo.path) : undefined;
  const afterUrl = after ? urls.data?.get(after.photo.path) : undefined;
  const positionValue = [
    POSITION_BEFORE_ONLY,
    POSITION_HALF,
    POSITION_AFTER_ONLY,
  ].includes(position)
    ? String(position)
    : '';

  return (
    <div className='mx-auto flex w-full max-w-xl flex-col pb-6 lg:max-w-5xl'>
      {header}
      {/* 모바일: 날짜·자세 → 비교 → 변화 순서로 쌓는다 (시안 20).
          PC: 왼쪽에 비교(세로로 길게), 오른쪽에 날짜·자세·변화 (시안 P6d). 배치 차이는 CSS로만 (CLAUDE.md) */}
      <div className='flex flex-col gap-4 px-4 md:px-6 lg:grid lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-8'>
        <div className='flex flex-col gap-3 lg:col-start-2 lg:row-start-1'>
          <div className='flex items-center gap-2'>
            <DateButton
              label='앞 날짜'
              date={range.from}
              disabled={isDemo}
              onClick={() => setPicking('from')}
            />
            <ArrowRight
              aria-hidden='true'
              size={20}
              strokeWidth={ICON_STROKE_WIDTH}
              className='shrink-0 text-fg-secondary'
            />
            <DateButton
              label='뒤 날짜'
              date={range.to}
              disabled={isDemo}
              onClick={() => setPicking('to')}
            />
          </div>
          {kindControl}
        </div>

        <div className='flex flex-col gap-3 lg:col-start-1 lg:row-span-2 lg:row-start-1'>
          <CompareSlider
            before={
              isDemo ? (
                <DemoBody kind={kind} widthScale={1.14} />
              ) : (
                <PhotoFill url={beforeUrl} />
              )
            }
            after={
              isDemo ? (
                <DemoBody kind={kind} widthScale={1} />
              ) : (
                <PhotoFill url={afterUrl} />
              )
            }
            beforeLabel={fromLabel}
            afterLabel={toLabel}
            position={position}
            onPositionChange={setPosition}
          />
          {isDemo && (
            <p className='text-caption text-fg-secondary'>
              체험용 예시 이미지예요. 눈바디 사진을 두 날짜 이상 올리면 실제
              사진으로 비교해요
            </p>
          )}
          <SegmentedControl
            aria-label='비교 위치'
            value={positionValue}
            onValueChange={(value) => setPosition(Number(value))}
            options={[
              { value: String(POSITION_BEFORE_ONLY), label: `${fromLabel}만` },
              { value: String(POSITION_HALF), label: '반반' },
              { value: String(POSITION_AFTER_ONLY), label: `${toLabel}만` },
            ]}
            className='w-full [&>*]:flex-1'
          />
        </div>

        <DiffSection
          diffs={diffs}
          days={daysBetween(range.from, range.to)}
          fromLabel={fromLabel}
          toLabel={toLabel}
        />
      </div>

      <Sheet
        open={picking !== null}
        onOpenChange={(open) => {
          if (!open) setPicking(null);
        }}
        title={picking === 'from' ? '앞 날짜' : '뒤 날짜'}
      >
        {/* 사진이 있는 날짜만 고른다 (달력이 아니라 목록): 사진 없는 날을 고르면 비교할 게 없다 */}
        <ul className='flex flex-col'>
          {[...dates].reverse().map((date) => {
            const isSelected =
              date === (picking === 'from' ? range.from : range.to);
            return (
              <li key={date}>
                <button
                  type='button'
                  aria-pressed={isSelected}
                  onClick={() => {
                    go(picking === 'from' ? { from: date } : { to: date });
                    setPicking(null);
                  }}
                  className={`flex min-h-12 w-full items-center rounded-md px-3 text-left text-body tabular-nums hover:bg-surface-hover ${isSelected ? 'font-semibold text-accent' : 'text-fg-primary'}`}
                >
                  {formatDisplayDate(date)}
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </div>
  );
}

// 체험 예시 기록 중 가장 앞·뒤 날짜
function demoRange(
  entries: readonly RecordEntryOf<'body'>[],
): { from: string; to: string } | null {
  const sorted = entries.map((entry) => entry.occurredAt).sort();
  const from = sorted[0];
  const to = sorted[sorted.length - 1];
  return from && to && from !== to ? { from, to } : null;
}

function DateButton({
  label,
  date,
  disabled,
  onClick,
}: {
  label: string;
  date: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label} ${formatDisplayDate(date)}, 바꾸기`}
      className='flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-surface text-body-sm font-semibold text-fg-primary tabular-nums enabled:hover:bg-surface-hover'
    >
      <Calendar
        aria-hidden='true'
        size={ICON_SIZE.sm}
        strokeWidth={ICON_STROKE_WIDTH}
        className='text-fg-secondary'
      />
      {formatShortDate(date)}
    </button>
  );
}

// 사진 한 장으로 틀 채우기. 서명 링크를 받는 동안은 빈 바탕
function PhotoFill({ url }: { url: string | undefined }) {
  if (!url)
    return (
      <div
        aria-busy='true'
        className='size-full animate-pulse bg-surface-hover'
      />
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 몇 분짜리 서명 링크라 next/image 최적화를 거치지 않는다
    <img
      src={url}
      alt=''
      draggable={false}
      className='size-full object-cover'
    />
  );
}

function DiffSection({
  diffs,
  days,
  fromLabel,
  toLabel,
}: {
  diffs: MeasureDiff[];
  days: number;
  fromLabel: string;
  toLabel: string;
}) {
  if (diffs.length === 0) {
    return (
      <p className='text-body-sm text-fg-secondary lg:col-start-2 lg:row-start-2'>
        두 날짜 근처에 체중·허리둘레 기록이 없어요
      </p>
    );
  }
  // 큰 숫자 카드(PC): 변화를 계산할 수 있는 첫 항목 (체중 먼저)
  const headline = diffs.find((diff) => diff.change !== null);
  return (
    <section
      aria-label='변화'
      className='flex flex-col gap-4 lg:col-start-2 lg:row-start-2'
    >
      {headline && (
        <div className='hidden flex-col gap-1 rounded-lg bg-surface p-4 shadow-card lg:flex'>
          <span className='text-caption font-medium text-fg-secondary'>
            {`${days}일 동안 ${headline.label}`}
          </span>
          <span className='text-[28px] leading-[34px] font-bold tracking-[-0.01em] text-fg-primary tabular-nums'>
            {headline.change}
          </span>
        </div>
      )}
      {/* 모바일: 한 줄에 "항목  앞 → 뒤  변화" (시안 20) */}
      <ul className='rounded-lg bg-surface px-4 py-1 shadow-card lg:hidden'>
        {diffs.map((diff, index) => (
          <li
            key={diff.measure}
            className={`grid min-h-10 grid-cols-[72px_minmax(0,1fr)_72px] items-center gap-2 text-body-sm tabular-nums ${index > 0 ? 'border-t border-border' : ''}`}
          >
            <span className='text-fg-secondary'>{diff.label}</span>
            <span>
              {diff.before ?? '—'} →{' '}
              <b className='font-semibold'>{diff.after ?? '—'}</b>
            </span>
            <span className='text-right font-semibold'>
              {diff.change ?? '—'}
            </span>
          </li>
        ))}
      </ul>
      {/* PC: 표 (시안 P6d) */}
      <table className='hidden w-full overflow-hidden rounded-lg bg-surface text-left shadow-card lg:table'>
        <thead>
          <tr className='text-caption font-medium text-fg-secondary tabular-nums'>
            <th className='h-11 px-4 font-medium'>항목</th>
            <th className='px-4 text-right font-medium'>{fromLabel}</th>
            <th className='px-4 text-right font-medium'>{toLabel}</th>
            <th className='px-4 text-right font-medium'>변화</th>
          </tr>
        </thead>
        <tbody>
          {diffs.map((diff) => (
            <tr
              key={diff.measure}
              className='h-12 border-t border-border text-body tabular-nums'
            >
              <th scope='row' className='px-4 font-normal'>
                {diff.label}
              </th>
              <td className='px-4 text-right text-fg-secondary'>
                {diff.before ?? '—'}
              </td>
              <td className='px-4 text-right'>{diff.after ?? '—'}</td>
              <td className='px-4 text-right font-semibold'>
                {diff.change ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
