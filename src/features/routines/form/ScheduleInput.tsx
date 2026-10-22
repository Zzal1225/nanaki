'use client';

// 'use client' 이유: 고른 요일·날짜를 바꾸는 입력 (폼 상태와 연결)
import FieldError from '@/shared/ui/FieldError';
import FilterChip from '@/shared/ui/FilterChip';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import TextField from '@/shared/ui/TextField';
import { parseNumberInput } from '@/features/records/form/inputValue';
import { WEEKDAY_LABELS } from '@/shared/schedule/schedule';
import { useId } from 'react';
import type { ScheduleDraft } from './routineDraft';

type ScheduleInputProps = {
  value: ScheduleDraft;
  onChange: (value: ScheduleDraft) => void;
  error?: string;
};

const KIND_OPTIONS = [
  { value: 'weekly', label: '요일 선택' },
  { value: 'monthly', label: '매달' },
] as const;

// 반복 입력 (시안 "반복: 요일 선택 / 매달").
// 종류를 바꿔도 다른 종류에서 고른 값은 기억해 둔다: 실수로 눌렀다 돌아왔을 때 다시 고르지 않게 (ScheduleDraft)
export default function ScheduleInput({
  value,
  onChange,
  error,
}: ScheduleInputProps) {
  const legendId = useId();

  function toggleDay(day: number) {
    const days = value.days.includes(day)
      ? value.days.filter((d) => d !== day)
      : [...value.days, day].sort((a, b) => a - b);
    onChange({ ...value, days });
  }

  return (
    <fieldset aria-labelledby={legendId} className='flex flex-col gap-2'>
      <span id={legendId} className='text-body-sm font-medium text-fg-primary'>
        반복
      </span>
      <SegmentedControl
        aria-label='반복 종류'
        options={KIND_OPTIONS}
        value={value.kind}
        onValueChange={(kind) =>
          onChange({ ...value, kind: kind as ScheduleDraft['kind'] })
        }
        className='self-start'
      />
      {value.kind === 'weekly' ? (
        <div
          role='group'
          aria-label='반복 요일'
          className='flex flex-wrap gap-2'
        >
          {WEEKDAY_LABELS.map((label, day) => (
            <FilterChip
              key={label}
              isSelected={value.days.includes(day)}
              onClick={() => toggleDay(day)}
              // 칩 글자가 한 글자라 44px 정사각형에 가깝게 (터치 영역 44px 규칙)
              className='min-w-11 justify-center px-0'
            >
              {label}
            </FilterChip>
          ))}
        </div>
      ) : (
        <div className='flex flex-col gap-1'>
          <TextField
            label='매달 며칠'
            unit='일'
            inputMode='numeric'
            value={value.day === undefined ? '' : String(value.day)}
            onChange={(e) =>
              onChange({ ...value, day: parseNumberInput(e.target.value) })
            }
          />
          <p className='text-caption text-fg-secondary'>
            31일이 없는 달은 말일에 해요
          </p>
        </div>
      )}
      <FieldError id={`${legendId}-error`} message={error} />
    </fieldset>
  );
}
