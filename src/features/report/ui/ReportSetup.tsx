'use client';

// 'use client' 이유: 오늘(브라우저 시간대)·고른 기간·타입이 화면 안 상태이고, 기기 사본에서 기간 안 기록 수를 센다
import { Check, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useRecords } from '@/features/records/hooks/useRecords';
import {
  RECORD_TYPE_CONFIG,
  type RecordType,
} from '@/features/records/schema/recordTypes';
import { RECORD_TYPE_STYLE } from '@/features/records/ui/recordTypeStyle';
import { useVisibleTypes } from '@/features/settings/hooks/useUserSettings';
import type { DateRange } from '@/shared/date/monthRange';
import { useToday } from '@/shared/date/useToday';
import Button from '@/shared/ui/Button';
import DateField from '@/shared/ui/DateField';
import FilterChip from '@/shared/ui/FilterChip';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { Checkbox } from 'radix-ui';
import {
  countLabel,
  presetRange,
  REPORT_PRESET_LABEL,
  reportHref,
  type ReportPreset,
} from '../reportModel';

const PRESETS = Object.keys(REPORT_PRESET_LABEL) as ReportPreset[];

// 보고서 만들기 (step4 40, 시안 21a): 기간(칩 4개 또는 날짜 두 칸) + 포함할 기록(켜 둔 타입, 기간 안 개수) → 결과 화면 주소로.
// 고른 값은 주소에 두지 않는다(만들기 전 잠깐의 상태). 결과는 주소에 남아 새로고침·공유된다 (reportHref)
export default function ReportSetup() {
  const today = useToday();
  const router = useRouter();
  const visibleTypes = useVisibleTypes();
  const [preset, setPreset] = useState<ReportPreset | null>('thisMonth');
  const [custom, setCustom] = useState<DateRange | null>(null);
  // null = 아직 안 건드림 → 켜 둔 타입 전부
  const [types, setTypes] = useState<RecordType[] | null>(null);

  const range: DateRange | null =
    custom ?? (today && preset ? presetRange(preset, today) : null);
  const records = useRecords(range);
  const selected = types ?? [...visibleTypes];
  const isRangeValid = range !== null && range.from <= range.to;

  function toggle(type: RecordType, checked: boolean) {
    setTypes(
      checked ? [...selected, type] : selected.filter((item) => item !== type),
    );
  }

  return (
    <div className='mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-6 md:px-6'>
      <div className='sticky top-0 z-20 -mx-4 flex h-14 items-center bg-bg px-1 md:-mx-6 md:px-3 lg:mt-4'>
        <Link
          href='/records'
          aria-label='기록 탭으로 돌아가기'
          className='inline-flex size-11 items-center justify-center rounded-md text-fg-primary hover:bg-surface-hover active:bg-surface-pressed'
        >
          <ChevronLeft
            aria-hidden='true'
            size={ICON_SIZE.lg}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </Link>
        <h1 className='ml-1 text-title text-fg-primary'>보고서</h1>
      </div>

      <section aria-labelledby='report-period' className='flex flex-col gap-3'>
        <h2
          id='report-period'
          className='text-body-sm font-medium text-fg-primary'
        >
          기간
        </h2>
        <div className='flex flex-wrap gap-2'>
          {PRESETS.map((value) => (
            <FilterChip
              key={value}
              isSelected={custom === null && preset === value}
              onClick={() => {
                setCustom(null);
                setPreset(value);
              }}
            >
              {REPORT_PRESET_LABEL[value]}
            </FilterChip>
          ))}
        </div>
        {range && (
          <div className='grid gap-3 sm:grid-cols-2'>
            {/* 날짜를 직접 바꾸면 칩 선택이 풀린다 (칩과 날짜 칸이 다른 기간을 가리키지 않게).
                모바일은 위아래로: 375px에서 두 칸을 나란히 두면 "2026. 10. 01 (목)"이 두 줄로 꺾인다 */}
            <DateField
              label='시작'
              value={range.from}
              onChange={(event) =>
                setCustom({ from: event.target.value, to: range.to })
              }
            />
            <DateField
              label='끝'
              value={range.to}
              onChange={(event) =>
                setCustom({ from: range.from, to: event.target.value })
              }
              error={isRangeValid ? undefined : '끝 날짜가 시작보다 앞이에요'}
            />
          </div>
        )}
      </section>

      <section aria-labelledby='report-types' className='flex flex-col gap-3'>
        <h2
          id='report-types'
          className='text-body-sm font-medium text-fg-primary'
        >
          포함할 기록
        </h2>
        <div className='overflow-hidden rounded-lg bg-surface shadow-card'>
          {visibleTypes.map((type, index) => {
            const style = RECORD_TYPE_STYLE[type];
            const Icon = style.icon;
            const isChecked = selected.includes(type);
            return (
              // 줄 전체가 체크박스: 22px 네모만 누르게 하면 터치 44px 규칙에 걸린다 (가계부 쓰기의 고정지출 칸과 같은 방식)
              <Checkbox.Root
                key={type}
                checked={isChecked}
                onCheckedChange={(value) => toggle(type, value === true)}
                className={`flex min-h-14 w-full items-center gap-3 px-4 text-left hover:bg-surface-hover ${index > 0 ? 'border-t border-border' : ''}`}
              >
                <span
                  aria-hidden='true'
                  className={`flex size-8 shrink-0 items-center justify-center rounded-md ${style.subtleBgClass} ${style.textClass}`}
                >
                  <Icon size={18} strokeWidth={ICON_STROKE_WIDTH} />
                </span>
                <span className='flex-1 text-body text-fg-primary'>
                  {RECORD_TYPE_CONFIG[type].label}
                </span>
                <span className='text-body-sm text-fg-secondary tabular-nums'>
                  {records.data ? countLabel(type, records.data) : ''}
                </span>
                <span
                  aria-hidden='true'
                  className='flex size-5.5 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-fg-secondary in-data-[state=checked]:border-accent in-data-[state=checked]:bg-accent in-data-[state=checked]:text-accent-foreground'
                >
                  <Checkbox.Indicator>
                    <Check
                      size={ICON_SIZE.sm}
                      strokeWidth={ICON_STROKE_WIDTH}
                    />
                  </Checkbox.Indicator>
                </span>
              </Checkbox.Root>
            );
          })}
        </div>
      </section>

      <Button
        disabled={!range || !isRangeValid || selected.length === 0}
        onClick={() => {
          if (!range) return;
          router.push(
            reportHref({ from: range.from, to: range.to, types: selected }),
          );
        }}
      >
        보고서 만들기
      </Button>
    </div>
  );
}
