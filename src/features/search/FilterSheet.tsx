'use client';

// 'use client' 이유: 시트 안에서 고르는 중인 조건(초안)을 상태로 들고, 그 조건의 결과 개수를 미리 불러온다
import { Calendar } from 'lucide-react';
import { useState } from 'react';
import { useSearchRecords } from '@/features/records/hooks/useSearchRecords';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import {
  RECORD_TYPE_CONFIG,
  type RecordType,
} from '@/features/records/schema/recordTypes';
import { RECORD_TYPE_STYLE } from '@/features/records/ui/recordTypeStyle';
import { RATING_MAX } from '@/features/records/schema/fieldKinds';
import Button from '@/shared/ui/Button';
import DateField from '@/shared/ui/DateField';
import FilterChip from '@/shared/ui/FilterChip';
import Sheet from '@/shared/ui/Sheet';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import {
  applyFieldFilters,
  getFilterFields,
  getSelectOptions,
  PERIOD_PRESET_LABEL,
  PERIOD_PRESETS,
  resolvePeriod,
  type FieldFilter,
  type FieldFilters,
  type FilterField,
  type PeriodFilter,
} from './searchFilters';
import { filterByType } from './searchResults';
import type { SearchState } from './searchState';

// "n점 이상"으로 고를 별점. 1점 이상은 모든 후기라 고를 이유가 없다
const RATING_MINIMUMS = Array.from(
  { length: RATING_MAX - 1 },
  (_, index) => index + 2,
);

export type FilterDraft = Pick<SearchState, 'period' | 'fields'>;

type FilterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: SearchState;
  visibleTypes: readonly RecordType[];
  // 지금 결과 (직접 입력한 분류를 선택지에 더할 때 쓴다)
  entries: readonly RecordEntry[];
  today: string | null;
  onApply: (draft: FilterDraft) => void;
};

// 필터 시트 (시안 14b, PC는 오른쪽 패널). 고른 타입의 칸은 필드 정의에서 만든다 (getFilterFields).
// 고르는 동안은 주소를 바꾸지 않고 초안(draft)에만 담는다: 칸 하나 바꿀 때마다 결과 목록이 뒤에서 바뀌면 산만하고,
// 시안처럼 "N개 결과 보기"로 한 번에 적용한다
export default function FilterSheet(props: FilterSheetProps) {
  return (
    <Sheet
      open={props.open}
      onOpenChange={props.onOpenChange}
      title='필터'
      titleAddon={props.state.type && <TypeBadge type={props.state.type} />}
    >
      {/* 열 때마다 지금 적용된 조건으로 초안을 새로 만든다 (닫았다 열면 고르다 만 값이 남지 않게).
          Sheet가 닫히면 내용이 사라지므로 열릴 때 새로 만들어진다 */}
      <FilterSheetBody {...props} />
    </Sheet>
  );
}

function FilterSheetBody({
  state,
  visibleTypes,
  entries,
  today,
  onApply,
}: FilterSheetProps) {
  const [draft, setDraft] = useState<FilterDraft>({
    period: state.period,
    fields: state.fields,
  });
  // 직접 선택은 날짜 둘을 다 골라야 조건이 된다. 하나만 고른 동안은 여기에만 둔다
  const [isCustomPeriod, setIsCustomPeriod] = useState(
    state.period?.kind === 'custom',
  );
  const [customFrom, setCustomFrom] = useState(
    state.period?.kind === 'custom' ? state.period.from : '',
  );
  const [customTo, setCustomTo] = useState(
    state.period?.kind === 'custom' ? state.period.to : '',
  );

  const period: PeriodFilter | null = isCustomPeriod
    ? customFrom && customTo
      ? customFrom <= customTo
        ? { kind: 'custom', from: customFrom, to: customTo }
        : { kind: 'custom', from: customTo, to: customFrom }
      : null
    : draft.period;
  const range = period ? resolvePeriod(period, today) : null;
  const isWaitingForToday = period !== null && range === null;

  // 초안의 결과 개수를 미리 받는다. 적용하면 같은 쿼리 키라 다시 받지 않는다
  const preview = useSearchRecords(
    !isWaitingForToday && (state.keyword || state.type || period)
      ? { keyword: state.keyword, sort: state.sort, range }
      : null,
  );
  const previewCount = preview.data
    ? filterByType(
        applyFieldFilters(preview.data.entries, state.type, draft.fields),
        state.type,
        visibleTypes,
      ).length
    : null;

  const fields = state.type ? getFilterFields(state.type) : [];

  function setField(name: string, filter: FieldFilter | null) {
    setDraft((current) => {
      const next: FieldFilters = { ...current.fields };
      if (filter) next[name] = filter;
      else delete next[name];
      return { ...current, fields: next };
    });
  }

  return (
    <div className='flex flex-col gap-6'>
      <section className='flex flex-col gap-2'>
        <h3 className='text-body-sm font-semibold text-fg-primary'>기간</h3>
        <div className='flex flex-wrap gap-2'>
          {PERIOD_PRESETS.map((preset) => {
            const isSelected =
              !isCustomPeriod &&
              draft.period?.kind === 'preset' &&
              draft.period.preset === preset;
            return (
              <FilterChip
                key={preset}
                isSelected={isSelected}
                onClick={() => {
                  setIsCustomPeriod(false);
                  // 고른 칩을 다시 누르면 풀린다 (기간 없음 = 전체 기간)
                  setDraft((current) => ({
                    ...current,
                    period: isSelected ? null : { kind: 'preset', preset },
                  }));
                }}
              >
                {PERIOD_PRESET_LABEL[preset]}
              </FilterChip>
            );
          })}
          <FilterChip
            isSelected={isCustomPeriod}
            onClick={() => setIsCustomPeriod((value) => !value)}
          >
            {!isCustomPeriod && (
              <Calendar
                aria-hidden='true'
                size={ICON_SIZE.sm}
                strokeWidth={ICON_STROKE_WIDTH}
                className='text-fg-secondary'
              />
            )}
            직접 선택
          </FilterChip>
        </div>
        {isCustomPeriod && (
          <div className='grid grid-cols-2 gap-2'>
            <DateField
              label='시작일'
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
            />
            <DateField
              label='종료일'
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
            />
          </div>
        )}
      </section>

      {fields.map((field) => (
        <FieldFilterInput
          key={field.def.name}
          field={field}
          filter={draft.fields[field.def.name] ?? null}
          options={
            field.kind === 'select'
              ? getSelectOptions(
                  field.def,
                  entries.filter((entry) => entry.type === state.type),
                  selectedValues(draft.fields[field.def.name]),
                )
              : []
          }
          onChange={(filter) => setField(field.def.name, filter)}
        />
      ))}

      {!state.type && (
        <p className='text-body-sm text-fg-secondary'>
          타입을 고르면 분류·금액 같은 항목으로도 거를 수 있어요
        </p>
      )}

      {/* 버튼 줄은 초안 상태(개수·적용)를 알아야 해서 본문 안에 두고, sticky로 스크롤해도 아래에 붙어 있게 한다 */}
      <div className='sticky bottom-0 -mx-4 -mb-4 flex gap-2 border-t border-border bg-surface-raised px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]'>
        <Button
          variant='secondary'
          className='h-12 flex-1'
          onClick={() => {
            setIsCustomPeriod(false);
            setCustomFrom('');
            setCustomTo('');
            setDraft({ period: null, fields: {} });
          }}
        >
          초기화
        </Button>
        <Button
          className='h-12 flex-[2] tabular-nums'
          // 직접 선택인데 날짜를 하나만 골랐으면 무엇을 적용할지 모호하다
          disabled={isCustomPeriod && period === null}
          onClick={() => onApply({ period, fields: draft.fields })}
        >
          {previewCount === null ? '결과 보기' : `${previewCount}개 결과 보기`}
        </Button>
      </div>
    </div>
  );
}

function selectedValues(filter: FieldFilter | undefined): string[] {
  return filter?.kind === 'select' ? filter.values : [];
}

function TypeBadge({ type }: { type: RecordType }) {
  const style = RECORD_TYPE_STYLE[type];
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex h-7 items-center gap-1 rounded-full pr-3 pl-2 text-caption font-semibold ${style.subtleBgClass} ${style.textClass}`}
    >
      <Icon aria-hidden='true' size={14} strokeWidth={ICON_STROKE_WIDTH} />
      {RECORD_TYPE_CONFIG[type].label}
    </span>
  );
}

type FieldFilterInputProps = {
  field: FilterField;
  filter: FieldFilter | null;
  options: string[];
  onChange: (filter: FieldFilter | null) => void;
};

// 칸 하나의 필터 입력. 모양은 필터 종류(select·range·rating)로만 갈린다 (타입별 분기 없음)
function FieldFilterInput({
  field,
  filter,
  options,
  onChange,
}: FieldFilterInputProps) {
  const { def, kind } = field;

  if (kind === 'select') {
    const values = selectedValues(filter ?? undefined);
    return (
      <section className='flex flex-col gap-2'>
        <h3 className='text-body-sm font-semibold text-fg-primary'>
          {def.label}
        </h3>
        <div className='flex flex-wrap gap-2'>
          {options.map((option) => {
            const isSelected = values.includes(option);
            return (
              <FilterChip
                key={option}
                isSelected={isSelected}
                onClick={() => {
                  const next = isSelected
                    ? values.filter((value) => value !== option)
                    : [...values, option];
                  onChange(next.length > 0 ? { kind, values: next } : null);
                }}
              >
                {option}
              </FilterChip>
            );
          })}
        </div>
      </section>
    );
  }

  if (kind === 'rating') {
    const min = filter?.kind === 'rating' ? filter.min : null;
    return (
      <section className='flex flex-col gap-2'>
        <h3 className='text-body-sm font-semibold text-fg-primary'>
          {def.label}
        </h3>
        <div className='flex flex-wrap gap-2'>
          {RATING_MINIMUMS.map((value) => (
            <FilterChip
              key={value}
              isSelected={min === value}
              onClick={() =>
                onChange(min === value ? null : { kind, min: value })
              }
            >
              ★ {value}점 이상
            </FilterChip>
          ))}
        </div>
      </section>
    );
  }

  const current = filter?.kind === 'range' ? filter : null;
  function setBound(bound: 'min' | 'max', text: string) {
    // 숫자 자판에서도 쉼표·공백이 섞여 들어올 수 있어 숫자만 남긴다
    const digits = text.replace(/[^\d]/g, '');
    const value = digits === '' ? null : Number(digits);
    const next = {
      min: current?.min ?? null,
      max: current?.max ?? null,
      [bound]: value,
    };
    onChange(
      next.min === null && next.max === null
        ? null
        : { kind: 'range', ...next },
    );
  }
  return (
    <section className='flex flex-col gap-2'>
      <h3 className='text-body-sm font-semibold text-fg-primary'>
        {def.label} 범위
      </h3>
      <div className='flex items-center gap-2'>
        <RangeBound
          label={`${def.label} 최소`}
          placeholder='최소'
          unit={def.unit ?? ''}
          value={current?.min ?? null}
          onChange={(text) => setBound('min', text)}
        />
        <span aria-hidden='true' className='text-fg-secondary'>
          ~
        </span>
        <RangeBound
          label={`${def.label} 최대`}
          placeholder='최대'
          unit={def.unit ?? ''}
          value={current?.max ?? null}
          onChange={(text) => setBound('max', text)}
        />
      </div>
    </section>
  );
}

function RangeBound({
  label,
  placeholder,
  unit,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  unit: string;
  value: number | null;
  onChange: (text: string) => void;
}) {
  return (
    <div className='flex h-12 min-w-0 flex-1 items-center gap-1 rounded-md border border-border bg-surface px-3 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent'>
      <input
        aria-label={label}
        // 숫자 자판 (CLAUDE.md). type=number는 쓰지 않는다: 스크롤로 값이 바뀌고 빈칸·글자를 구분하지 못한다
        inputMode='numeric'
        placeholder={placeholder}
        value={value === null ? '' : value.toLocaleString('ko-KR')}
        onChange={(event) => onChange(event.target.value)}
        className='min-w-0 flex-1 bg-transparent text-right text-body font-semibold text-fg-primary tabular-nums outline-none placeholder:font-normal placeholder:text-fg-secondary'
      />
      {unit && <span className='text-body text-fg-secondary'>{unit}</span>}
    </div>
  );
}
