'use client';

// 'use client' 이유: 목표 종류·횟수를 바꾸는 입력 (폼 상태와 연결)
import { useId } from 'react';
import { parseNumberInput } from '@/features/records/form/inputValue';
import FieldError from '@/shared/ui/FieldError';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import { withObjectParticle } from '@/shared/text/withObjectParticle';
import TextField from '@/shared/ui/TextField';
import { DEFAULT_COUNT_UNIT, MAX_COUNT_UNIT_LENGTH } from '../schema/routine';
import type { GoalDraft } from './routineDraft';

type GoalInputProps = {
  value: GoalDraft;
  onChange: (value: GoalDraft) => void;
  error?: string;
};

const KIND_OPTIONS = [
  { value: 'check', label: '체크' },
  { value: 'count', label: '횟수' },
] as const;

// 목표 입력 (시안 "목표: 체크 / 횟수 8잔"). 아래 안내 문장이 "언제 완료로 치는지"를 알려 준다
export default function GoalInput({ value, onChange, error }: GoalInputProps) {
  const legendId = useId();
  const unit = value.unit.trim() || DEFAULT_COUNT_UNIT;

  return (
    <fieldset aria-labelledby={legendId} className='flex flex-col gap-2'>
      <span id={legendId} className='text-body-sm font-medium text-fg-primary'>
        목표
      </span>
      <SegmentedControl
        aria-label='목표 종류'
        options={KIND_OPTIONS}
        value={value.kind}
        onValueChange={(kind) =>
          onChange({ ...value, kind: kind as GoalDraft['kind'] })
        }
        className='self-start'
      />
      {value.kind === 'count' && (
        <div className='grid grid-cols-2 gap-2'>
          <TextField
            label='하루 횟수'
            inputMode='numeric'
            value={
              value.targetCount === undefined ? '' : String(value.targetCount)
            }
            onChange={(e) =>
              onChange({
                ...value,
                targetCount: parseNumberInput(e.target.value),
              })
            }
          />
          <TextField
            label='단위 (선택)'
            placeholder={DEFAULT_COUNT_UNIT}
            maxLength={MAX_COUNT_UNIT_LENGTH}
            value={value.unit}
            onChange={(e) => onChange({ ...value, unit: e.target.value })}
          />
        </div>
      )}
      <p className='text-caption text-fg-secondary'>
        {value.kind === 'check'
          ? '한 번 체크하면 완료돼요'
          : // 조사는 단위에 따라: "8잔을", "8회를"
            `하루 ${withObjectParticle(`${value.targetCount ?? 'n'}${unit}`)} 채우면 완료돼요`}
      </p>
      <FieldError id={`${legendId}-error`} message={error} />
    </fieldset>
  );
}
