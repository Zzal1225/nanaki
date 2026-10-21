import { z } from 'zod';
import {
  ratingField,
  selectField,
  toFieldsSchema,
  type FieldDef,
} from './fieldKinds';

// 직접 입력을 받지 않는다. 필터(step2)·AI(step3)가 이 값들로 정확히 걸러야 해서
// as const: 없으면 string[]로 넓어져 targetKind 타입도 string이 된다
export const REVIEW_TARGET_KINDS = ['장소', '제품', '콘텐츠', '경험'] as const;

// 배열 순서 = 폼의 입력칸 순서
// '#재방문' 같은 표시는 필드가 아니라 공통 tags에 들어간다.
// 장소 칸은 두지 않는다 (2026-10-21): 장소 후기는 제목이 곧 장소 이름("블루보틀 성수")이라 같은 말을 두 번 쓰게 되고,
// 제품·콘텐츠·경험 후기에는 쓸 일이 없다. 예전에 저장된 place 값은 z.object가 모르는 키로 보고 읽을 때 떨어뜨린다
export const REVIEW_FIELDS = [
  ratingField({ name: 'rating', label: '별점' }),
  selectField({
    name: 'targetKind',
    label: '대상',
    options: REVIEW_TARGET_KINDS,
  }),
] satisfies readonly FieldDef[];

export const reviewFieldsSchema = toFieldsSchema(REVIEW_FIELDS);
export type ReviewFields = z.infer<typeof reviewFieldsSchema>;
