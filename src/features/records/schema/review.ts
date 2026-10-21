import { z } from 'zod';
import {
  ratingField,
  selectField,
  textField,
  optional,
  toFieldsSchema,
  type FieldDef,
} from './fieldKinds';

export const MAX_PLACE_LENGTH = 40;

// 직접 입력을 받지 않는다. 필터(step2)·AI(step3)가 이 값들로 정확히 걸러야 해서
// as const: 없으면 string[]로 넓어져 targetKind 타입도 string이 된다
export const REVIEW_TARGET_KINDS = ['장소', '제품', '콘텐츠', '경험'] as const;

// 배열 순서 = 폼의 입력칸 순서
// '#재방문' 같은 표시는 필드가 아니라 공통 tags에 들어간다
export const REVIEW_FIELDS = [
  ratingField({ name: 'rating', label: '별점' }),
  selectField({
    name: 'targetKind',
    label: '대상',
    options: REVIEW_TARGET_KINDS,
  }),
  // 제품·콘텐츠 후기에는 장소가 없으므로 선택
  optional(
    textField({
      name: 'place',
      label: '장소',
      maxLength: MAX_PLACE_LENGTH,
      // 주소가 아니라 장소 이름이라는 걸 예시로 알려 준다
      placeholder: '장소 이름 (예: 블루보틀 성수)',
    }),
  ),
] satisfies readonly FieldDef[];

export const reviewFieldsSchema = toFieldsSchema(REVIEW_FIELDS);
export type ReviewFields = z.infer<typeof reviewFieldsSchema>;
