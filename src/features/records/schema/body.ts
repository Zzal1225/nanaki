import { z } from 'zod';
import {
  numberField,
  optional,
  toFieldsSchema,
  type FieldDef,
} from './fieldKinds';

// 체형은 체중(필수) + 고정 선택 항목 (2026-10-22 사용자 결정).
// 시안은 "설정에서 측정 항목 고르기·직접 만들기"였지만, 그러면 설정 테이블 마이그레이션·항목 편집 화면·
// 사용자마다 다른 fields 모양이 생긴다. 일상 기록에는 흔한 항목을 고정으로 두고 비워 둘 수 있게 하는 편이 가볍다.
// 눈바디 사진은 step4

// 측정값은 모두 소수 한 자리 (체중계·줄자가 보통 0.1 단위)
export const BODY_DECIMALS = 1;
// 0을 하나 더 누르는 오타를 막는 상한
export const MAX_BODY_WEIGHT_KG = 300;
export const MAX_BODY_CIRCUMFERENCE_CM = 200;
export const MAX_BODY_FAT_PERCENT = 70;

function circumferenceField<const N extends string>(name: N, label: string) {
  return optional(
    numberField({
      name,
      label,
      unit: 'cm',
      max: MAX_BODY_CIRCUMFERENCE_CM,
      decimals: BODY_DECIMALS,
    }),
  );
}

// 배열 순서 = 폼의 입력칸 순서 = 제목·하루 요약에서 항목을 나열하는 순서.
// 둘레를 체지방률보다 앞에 둔다: 시안의 하루 요약이 "68.4kg · 허리 78cm"처럼 체중 다음에 허리를 보여 준다
export const BODY_FIELDS = [
  numberField({
    name: 'weight',
    label: '체중',
    unit: 'kg',
    max: MAX_BODY_WEIGHT_KG,
    decimals: BODY_DECIMALS,
  }),
  circumferenceField('waist', '허리'),
  circumferenceField('hip', '엉덩이'),
  circumferenceField('thigh', '허벅지'),
  optional(
    numberField({
      name: 'bodyFat',
      label: '체지방률',
      unit: '%',
      max: MAX_BODY_FAT_PERCENT,
      decimals: BODY_DECIMALS,
    }),
  ),
] satisfies readonly FieldDef[];

export const bodyFieldsSchema = toFieldsSchema(BODY_FIELDS);
export type BodyFields = z.infer<typeof bodyFieldsSchema>;

// 적은 항목만 순서대로: [{ label: '체중', value: 68.4, unit: 'kg' }, { label: '허리', ... }].
// 제목 기본값·하루 요약·요약 카드 칩이 같은 순서와 이름을 쓰게 여기 한 곳에서 만든다
export function listBodyMeasurements(
  fields: BodyFields,
): { name: string; label: string; value: number; unit: string }[] {
  return BODY_FIELDS.flatMap((field) => {
    const value = fields[field.name];
    return value === undefined
      ? []
      : [
          {
            name: field.name,
            label: field.label,
            value,
            unit: field.unit ?? '',
          },
        ];
  });
}

// 제목을 비웠을 때의 기본 제목: 적은 항목 이름 ("체중 · 허리", 시안의 목록 제목)
export function toBodyTitle(fields: BodyFields): string {
  return listBodyMeasurements(fields)
    .map((measurement) => measurement.label)
    .join(' · ');
}
