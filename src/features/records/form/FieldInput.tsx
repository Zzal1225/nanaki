import ChipSelect from '@/shared/ui/ChipSelect';
import RatingInput from '@/shared/ui/RatingInput';
import TextField from '@/shared/ui/TextField';
import { RATING_MAX } from '../schema/fieldKinds';
import type { FieldView } from '../ui/fieldView';
import DecimalInput from './DecimalInput';
import {
  emptyToUndefined,
  formatNumberInput,
  parseNumberInput,
} from './inputValue';

// kind로만 갈라서 기록 타입(가계부·후기)은 모른다 → 새 타입이 생겨도 이 파일은 그대로
type FieldInputProps = {
  field: FieldView;
  // 폼 값은 검증 전이라 무엇이든 올 수 있다. 각 분기에서 그 입력칸에 맞게 좁혀 쓴다
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  // 폼 위에 "무엇 중 1개 이상" 같은 안내가 있으면 칸마다 "(선택)"을 붙이지 않는다 (체형, 2026-10-24 사용자 결정)
  hidesOptionalMark?: boolean;
};

export default function FieldInput({
  field,
  value,
  onChange,
  error,
  hidesOptionalMark = false,
}: FieldInputProps) {
  // 선택 칸만 이름 옆에 표시한다 (시안: 필수가 기본)
  const label =
    field.isOptional && !hidesOptionalMark
      ? `${field.label} (선택)`
      : field.label;

  // switch로 kind를 확인하면 TypeScript가 field를 그 모양으로 좁혀서 unit·options 같은 칸을 쓸 수 있다
  switch (field.kind) {
    case 'number':
      if (field.decimals) {
        return (
          <DecimalInput
            label={label}
            unit={field.unit}
            decimals={field.decimals}
            value={value}
            onChange={onChange}
            error={error}
          />
        );
      }
      return (
        <TextField
          label={label}
          unit={field.unit}
          // 모바일에서 숫자 자판을 띄운다. type='number'는 쉼표 표시가 안 되고 휠·화살표로 값이 바뀌어 쓰지 않는다
          inputMode='numeric'
          value={formatNumberInput(value)}
          onChange={(e) => onChange(parseNumberInput(e.target.value))}
          error={error}
        />
      );
    case 'select':
      return (
        <ChipSelect
          label={label}
          options={field.options}
          allowCustom={field.allowCustom}
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
          error={error}
        />
      );
    case 'rating':
      return (
        <RatingInput
          label={label}
          max={RATING_MAX}
          value={typeof value === 'number' ? value : undefined}
          onChange={onChange}
          error={error}
        />
      );
    case 'text':
      return (
        <TextField
          label={label}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(emptyToUndefined(e.target.value))}
          error={error}
        />
      );
    default: {
      // 새 kind(step2의 boolean·list)를 FieldView에 추가하고 여기를 빠뜨리면 never 자리에 값이 들어와 타입 오류가 난다
      const unhandled: never = field;
      throw new Error(`처리하지 않은 필드 종류: ${JSON.stringify(unhandled)}`);
    }
  }
}
