import { formatRating } from './recordPresentation';

// 화면(작성 폼 입력칸, 상세 표)에 필요한 필드 정보만. 빌더(fieldKinds)가 만든 정의는 이 모양을 모두 만족한다.
// 검증 schema는 빼 둔다. 화면 컴포넌트가 Zod를 몰라도 되게
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

// 상세 표 한 칸의 글자. 값이 없으면(선택 칸을 비움) null → 그 줄을 그리지 않는다.
// kind로만 갈라서 기록 타입은 모른다 (새 타입이 생겨도 그대로)
export function formatFieldValue(
  field: FieldView,
  value: unknown,
): string | null {
  switch (field.kind) {
    case 'number':
      return typeof value === 'number'
        ? `${value.toLocaleString('ko-KR')}${field.unit ?? ''}`
        : null;
    case 'rating':
      return typeof value === 'number' ? formatRating(value) : null;
    case 'select':
    case 'text':
      return typeof value === 'string' && value !== '' ? value : null;
    default: {
      // 새 kind를 FieldView에 추가하고 여기를 빠뜨리면 타입 오류가 난다
      const unhandled: never = field;
      throw new Error(`처리하지 않은 필드 종류: ${JSON.stringify(unhandled)}`);
    }
  }
}
