import ChipSelect from '@/shared/ui/ChipSelect';
import RatingInput from '@/shared/ui/RatingInput';
import TextField from '@/shared/ui/TextField';
import { RATING_MAX } from '../schema/fieldKinds';
import {
  emptyToUndefined,
  formatNumberInput,
  parseNumberInput,
} from './inputValue';

// 화면에 필요한 정보만 받는다(검증 schema는 폼이 따로 쓴다). 빌더가 만든 정의는 이 모양을 모두 만족한다.
// kind로만 갈라서 기록 타입(가계부·후기)은 모른다 → 새 타입이 생겨도 이 파일은 그대로
export type FieldView =
  | {
      kind: 'number';
      name: string;
      label: string;
      unit?: string;
      isOptional?: boolean;
    }
  | {
      kind: 'select';
      name: string;
      label: string;
      options: readonly string[];
      allowCustom: boolean;
      isOptional?: boolean;
    }
  | { kind: 'rating'; name: string; label: string; isOptional?: boolean }
  | {
      kind: 'text';
      name: string;
      label: string;
      maxLength: number;
      placeholder?: string;
      isOptional?: boolean;
    };

type FieldInputProps = {
  field: FieldView;
  // 폼 값은 검증 전이라 무엇이든 올 수 있다. 각 분기에서 그 입력칸에 맞게 좁혀 쓴다
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
};

export default function FieldInput({
  field,
  value,
  onChange,
  error,
}: FieldInputProps) {
  // 선택 칸만 이름 옆에 표시한다 (시안: 필수가 기본)
  const label = field.isOptional ? `${field.label} (선택)` : field.label;

  // switch로 kind를 확인하면 TypeScript가 field를 그 모양으로 좁혀서 unit·options 같은 칸을 쓸 수 있다
  switch (field.kind) {
    case 'number':
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
