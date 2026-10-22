import { z } from 'zod';
import {
  numberField,
  optional,
  toFieldsSchema,
  type FieldDef,
} from './fieldKinds';

// 체형은 체중 또는 허리둘레 (2026-10-22 사용자 결정, 두 번째 정리).
// - 처음엔 체중 필수 + 허리·엉덩이·허벅지·체지방률 선택이었는데, 실제로 재는 건 체중과 허리둘레뿐이라 나머지를 뺐다.
// - 한 기록에 하나만 적는다: 체중과 허리둘레는 재는 날·주기가 달라서, 따로 쌓아야 각각의 그래프가 깔끔하다.
// - 시안의 "설정에서 측정 항목 고르기"는 하지 않는다 (마이그레이션·항목 편집 화면이 생긴다).
// 예전에 저장된 hip·thigh·bodyFat 값은 z.object가 모르는 키로 보고 읽을 때 떨어뜨린다 (DB에는 남는다)

// 체중계·줄자가 보통 0.1 단위
export const BODY_DECIMALS = 1;
// 0을 하나 더 누르는 오타를 막는 상한
export const MAX_BODY_WEIGHT_KG = 300;
export const MAX_BODY_CIRCUMFERENCE_CM = 200;

// 배열 순서 = 폼의 입력칸 순서. 둘 다 optional이고 "하나는 있어야 한다"는 아래 스키마의 refine이 맡는다
export const BODY_FIELDS = [
  optional(
    numberField({
      name: 'weight',
      label: '체중',
      unit: 'kg',
      max: MAX_BODY_WEIGHT_KG,
      decimals: BODY_DECIMALS,
    }),
  ),
  optional(
    numberField({
      name: 'waist',
      label: '허리둘레',
      unit: 'cm',
      max: MAX_BODY_CIRCUMFERENCE_CM,
      decimals: BODY_DECIMALS,
    }),
  ),
] satisfies readonly FieldDef[];

export const BODY_REQUIRED_MESSAGE = '체중이나 허리둘레를 입력해 주세요';
export const BODY_ONLY_ONE_MESSAGE = '체중과 허리둘레 중 하나만 입력해 주세요';

// 저장된 기록: 적어도 하나. 둘 다 있는 기록도 읽는다 (규칙을 바꾸기 전에 저장된 기록이 목록에서 사라지지 않게).
// "하나만"은 새로 쓰거나 고칠 때(폼)만 검사한다 (recordEntry.ts의 bodyFormSchema)
export const bodyFieldsSchema = toFieldsSchema(BODY_FIELDS).refine(
  (fields) => fields.weight !== undefined || fields.waist !== undefined,
  { error: BODY_REQUIRED_MESSAGE, path: ['weight'] },
);
export type BodyFields = z.infer<typeof bodyFieldsSchema>;

export type BodyMeasure = 'weight' | 'waist';

// 이 기록이 무엇을 잰 기록인지. 둘 다 있는 예전 기록은 체중으로 본다 (목록·제목이 체중을 보여 준다)
export function measureOf(fields: BodyFields): BodyMeasure {
  return fields.weight !== undefined ? 'weight' : 'waist';
}

export const BODY_MEASURE_LABEL: Record<BodyMeasure, string> = {
  weight: '체중',
  waist: '허리둘레',
};
export const BODY_MEASURE_UNIT: Record<BodyMeasure, string> = {
  weight: 'kg',
  waist: 'cm',
};

// 제목은 입력받지 않고 잰 항목 이름으로 저장한다 ("체중" / "허리둘레"). DB title이 not null이라 비울 수 없다
export function toBodyTitle(fields: BodyFields): string {
  return BODY_MEASURE_LABEL[measureOf(fields)];
}
