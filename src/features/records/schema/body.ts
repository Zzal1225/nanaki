import { z } from 'zod';
import {
  numberField,
  optional,
  toFieldsSchema,
  type FieldDef,
} from './fieldKinds';
import { photoOnlyTitle, type PhotoKind } from './photoKinds';

// 체형은 체중 · 허리둘레 · 사진(눈바디) 중 1개 이상 (2026-10-24 사용자 결정, 세 번째 정리).
// - 처음엔 체중 필수 + 허리·엉덩이·허벅지·체지방률 선택이었는데, 실제로 재는 건 체중과 허리둘레뿐이라 나머지를 뺐다.
// - 10-22에는 "한 기록에 하나만"이었는데, 같은 날 재면 두 번 쓰는 게 번거로워 둘 다 허용한다.
//   그래프·요약은 원래 칸마다 따로 세서(체중이 있는 기록만, 허리둘레가 있는 기록만) 그대로 된다.
// - 사진만 있는 기록(눈바디만 찍은 날)도 된다. 사진은 기록 밖(photos 표)이라 "1개 이상"은 폼에서 사진 장수를 받아 검사한다 (bodyFormSchemaFor)
// - 시안의 "설정에서 측정 항목 고르기"는 하지 않는다 (마이그레이션·항목 편집 화면이 생긴다).
// 예전에 저장된 hip·thigh·bodyFat 값은 z.object가 모르는 키로 보고 읽을 때 떨어뜨린다 (DB에는 남는다)

// 체중계·줄자가 보통 0.1 단위
export const BODY_DECIMALS = 1;
// 0을 하나 더 누르는 오타를 막는 상한
export const MAX_BODY_WEIGHT_KG = 300;
export const MAX_BODY_CIRCUMFERENCE_CM = 200;

// 배열 순서 = 폼의 입력칸 순서. 둘 다 optional이고 "1개 이상"은 폼 스키마의 refine이 맡는다
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

// 쓰기 화면 위 안내 한 줄 (칸마다 "(선택)"을 붙이는 대신, 2026-10-24 사용자 결정)과 검사 실패 문구
export const BODY_CONTENT_HINT = '체중, 허리둘레, 사진 중 1개 이상 입력';
export const BODY_CONTENT_MESSAGE =
  '체중, 허리둘레, 사진 중 1개 이상 입력해 주세요';

// 저장된 기록: 두 칸 모두 비어도 읽는다 (사진만 있는 기록). 사진은 이 스키마가 볼 수 없는 곳(photos 표)에 있어서,
// "비어 있으면 안 된다"는 사진 장수를 아는 폼(bodyFormSchemaFor)과 마지막 사진 지우기(기록도 지움)가 지킨다
export const bodyFieldsSchema = toFieldsSchema(BODY_FIELDS);
export type BodyFields = z.infer<typeof bodyFieldsSchema>;

export type BodyMeasure = 'weight' | 'waist';

const BODY_MEASURES: readonly BodyMeasure[] = ['weight', 'waist'];

// 이 기록에 적힌 항목 (체중 먼저). 사진만 있는 기록은 빈 배열
export function measuresOf(fields: BodyFields): BodyMeasure[] {
  return BODY_MEASURES.filter((measure) => fields[measure] !== undefined);
}

// 폼 검사: 체중·허리둘레·사진 중 1개 이상
export function hasBodyContent(
  fields: BodyFields,
  photoCount: number,
): boolean {
  return measuresOf(fields).length > 0 || photoCount > 0;
}

export const BODY_MEASURE_LABEL: Record<BodyMeasure, string> = {
  weight: '체중',
  waist: '허리둘레',
};
export const BODY_MEASURE_UNIT: Record<BodyMeasure, string> = {
  weight: 'kg',
  waist: 'cm',
};

// 사진만 있는 기록인데 사진 종류를 모를 때의 제목 (예전 기록, 하루 요약 줄)
export const BODY_PHOTO_ONLY_TITLE = '눈바디';

// 제목은 입력받지 않고 잰 항목 이름으로 저장한다 ("체중" / "허리둘레" / "체중·허리둘레").
// 사진만이면 사진 종류로 "정면 사진" / "측면 사진" / "정면·측면 사진" (photoOnlyTitle), 종류를 모르면 "눈바디".
// DB title이 not null이라 비울 수 없다
export function toBodyTitle(
  fields: BodyFields,
  photoKinds: readonly PhotoKind[] = [],
): string {
  const measures = measuresOf(fields);
  if (measures.length === 0) {
    return photoKinds.length > 0
      ? photoOnlyTitle(photoKinds)
      : BODY_PHOTO_ONLY_TITLE;
  }
  return measures.map((measure) => BODY_MEASURE_LABEL[measure]).join('·');
}
