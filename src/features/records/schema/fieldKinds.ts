import { z } from 'zod';
import { withObjectParticle } from '@/shared/text/withObjectParticle';

// 아래에서 문구를 정하지 않은 경우의 대비책. Zod 기본 한국어 문구는 개발자용이라("예상 타입은 number…")
// 사용자에게 보이는 규칙에는 모두 직접 문구를 붙인다
z.config(z.locales.ko());

// 사용자에게 보이는 검증 문구. 필드 이름으로 만들어서 새 필드가 생겨도 문구를 따로 쓰지 않는다
export function requiredInputMessage(label: string): string {
  return `${withObjectParticle(label)} 입력해 주세요`;
}
export function requiredChoiceMessage(label: string): string {
  return `${withObjectParticle(label)} 골라 주세요`;
}
export function maxLengthMessage(maxLength: number): string {
  return `${maxLength}자까지 쓸 수 있어요`;
}

// 별점은 어느 타입이든 같은 범위라서 타입별 파일이 아니라 빌더 쪽에 둔다
export const RATING_MIN = 1;
export const RATING_MAX = 5;

// 필드 정의 하나에 화면 정보(이름·단위·선택지)와 검증(Zod)을 함께 담는다.
// 폼·필터·카드가 이 정의만 보고 그려서, 컴포넌트에 타입별 분기(if type === 'expense')가 생기지 않는다.
// step1은 4종류만. boolean·list는 운동·루틴과 함께 step2에 추가한다
export type FieldKind = 'number' | 'select' | 'rating' | 'text';

// 모든 빌더가 돌려주는 공통 모양. 각 빌더는 여기에 자기 종류의 정보(unit, options ...)를 더한다
export type FieldDef = {
  name: string;
  kind: FieldKind;
  label: string;
  schema: z.ZodType;
  isOptional?: boolean;
};

// 빌더의 반환 타입은 쓰지 않고 추론에 맡긴다. 그래야 schema가 ZodNumber, ZodEnum<...>처럼 정확히 남는다.
// kind의 as const: 없으면 string으로 넓어져 FieldKind와 맞지 않는다

// <const N extends string>: name이 string으로 넓어지지 않고 'amount'처럼 남아야
// toFieldsSchema가 키 이름을 알 수 있다
export function numberField<const N extends string>(options: {
  name: N;
  label: string;
  unit?: string;
  // 상한은 필수. 빠뜨리면 타입 오류가 나서 상한을 깜빡할 수 없다
  max: number;
}) {
  return {
    ...options,
    kind: 'number' as const,
    // 비어 있으면(undefined) 타입 오류로 오므로 그때 "입력해 주세요"를 보여 준다
    schema: z
      .number({ error: requiredInputMessage(options.label) })
      .int({ error: '정수로 입력해 주세요' })
      .positive({ error: '0보다 큰 값을 입력해 주세요' })
      .max(options.max, {
        error: `${options.max.toLocaleString('ko-KR')}${options.unit ?? ''}까지 입력할 수 있어요`,
      }),
  };
}

// 직접 입력 허용 선택 (가계부 분류·결제수단). allowCustom은 폼이 직접 입력칸을 보여 줄지 정한다
export function customSelectField<const N extends string>(options: {
  name: N;
  label: string;
  // 검증에는 쓰지 않는다. 폼에서 보여 줄 기본 선택지
  options: readonly string[];
  maxLength: number;
}) {
  return {
    ...options,
    kind: 'select' as const,
    // trim이 min(1)보다 앞이어야 공백만 입력한 값이 막힌다.
    // 안 골랐으면 undefined(타입 오류), 직접 입력칸을 비웠으면 ''(min 오류) — 둘 다 "골라 주세요"
    schema: z
      .string({ error: requiredChoiceMessage(options.label) })
      .trim()
      .min(1, { error: requiredChoiceMessage(options.label) })
      .max(options.maxLength, { error: maxLengthMessage(options.maxLength) }),
    allowCustom: true as const,
  };
}

// 고정 선택 (후기 대상 종류)
// [string, ...string[]]: 빈 배열을 타입 단계에서 막는다. z.enum은 선택지가 1개 이상 필요하다
export function selectField<
  const N extends string,
  const O extends readonly [string, ...string[]],
>(options: { name: N; label: string; options: O }) {
  return {
    ...options,
    kind: 'select' as const,
    schema: z.enum(options.options, {
      error: requiredChoiceMessage(options.label),
    }),
    allowCustom: false as const,
  };
}

// number와 kind를 나눈 이유: 폼은 별 UI, 필터는 "n점 이상"으로 다르게 그려야 한다
export function ratingField<const N extends string>(options: {
  name: N;
  label: string;
}) {
  return {
    ...options,
    kind: 'rating' as const,
    schema: z
      .int({ error: requiredChoiceMessage(options.label) })
      .min(RATING_MIN, { error: requiredChoiceMessage(options.label) })
      .max(RATING_MAX, { error: `${RATING_MAX}점까지 고를 수 있어요` }),
  };
}

export function textField<const N extends string>(options: {
  name: N;
  label: string;
  maxLength: number;
  // 무엇을 쓰는 칸인지 이름만으로 헷갈릴 때 예시를 보여 준다 (예: '장소 이름 (예: 블루보틀 성수)')
  placeholder?: string;
}) {
  return {
    ...options,
    kind: 'text' as const,
    schema: z
      .string({ error: requiredInputMessage(options.label) })
      .trim()
      .min(1, { error: requiredInputMessage(options.label) })
      .max(options.maxLength, { error: maxLengthMessage(options.maxLength) }),
  };
}

// 빌더마다 optional 옵션을 두면 "true면 ZodOptional, 아니면 그대로"를 조건부 타입으로 써야 해서,
// 받은 필드를 감싸는 함수를 따로 둔다. 반환 타입은 추론이 부정확해서 직접 적었다 (schema 칸만 바꿔 끼운 모양).
// isOptional은 폼이 이름 옆에 "(선택)"을 붙일 때 쓴다
export function optional<F extends FieldDef>(
  field: F,
): Omit<F, 'schema'> & {
  schema: z.ZodOptional<F['schema']>;
  isOptional: true;
} {
  return {
    ...field,
    schema: z.optional(field.schema),
    isOptional: true,
  };
}

// [amount 정의, category 정의] → { amount: ZodNumber; category: ZodString }
// T[number]는 배열 요소들의 유니온, as F['name']으로 각 요소의 name을 키로 바꾼다
type FieldsShape<T extends readonly FieldDef[]> = {
  [F in T[number] as F['name']]: F['schema'];
};

// 배열 순서 = 폼의 입력칸 순서. 검증용 객체는 순서가 필요 없어서 name을 키로 모은다
export function toFieldsSchema<T extends readonly FieldDef[]>(defs: T) {
  const entries = defs.map((d) => [d.name, d.schema]);
  // Object.fromEntries는 키 정보를 잃는다. name과 schema를 그대로 짝지었으므로 FieldsShape<T>와 같은 모양이다
  const shape = Object.fromEntries(entries) as FieldsShape<T>;
  return z.object(shape);
}
