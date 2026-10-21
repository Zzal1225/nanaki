import { z } from 'zod';

export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const MAX_PLACE_LENGTH = 40;

// 직접 입력을 받지 않는다. 필터(step2)·AI(step3)가 이 값들로 정확히 걸러야 해서
// as const: 없으면 string[]로 넓어져 targetKind 타입도 string이 된다
export const REVIEW_TARGET_KINDS = ['장소', '제품', '콘텐츠', '경험'] as const;

// '#재방문' 같은 표시는 필드가 아니라 공통 tags에 들어간다
export const reviewFieldsSchema = z.object({
  rating: z.int().min(RATING_MIN).max(RATING_MAX),
  targetKind: z.enum(REVIEW_TARGET_KINDS),
  // 제품·콘텐츠 후기에는 장소가 없으므로 선택
  place: z.string().trim().min(1).max(MAX_PLACE_LENGTH).optional(),
});

export type ReviewFields = z.infer<typeof reviewFieldsSchema>;
