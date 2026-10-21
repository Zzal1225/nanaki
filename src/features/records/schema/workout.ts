import { z } from 'zod';
import {
  customSelectField,
  numberField,
  optional,
  toFieldsSchema,
  type FieldDef,
} from './fieldKinds';

// nanaki는 전문 운동 앱이 아니라 일상 기록이라, 종목과 시간만으로 빨리 남기는 것을 우선한다 (2026-10-21 사용자 결정).
// 세트·무게·횟수는 넣지 않았고, 종목에 따라 칸이 바뀌는 규칙(유산소면 거리, 근력이면 세트)도 두지 않는다.
// 거리는 어느 종목이든 원할 때만 적는 선택 칸이다

// 시안의 기본 종목. 목록에 없는 운동(필라테스, 클라이밍 …)은 직접 입력한다.
// 직접 입력값은 검증에 쓰지 않으므로 이 목록은 폼의 기본 선택지일 뿐이다
export const WORKOUT_ACTIVITIES = [
  '러닝',
  '걷기',
  '자전거',
  '수영',
  '헬스',
  '요가',
] as const;

export const MAX_WORKOUT_ACTIVITY_LENGTH = 12;
// 하루는 1440분. 이보다 크면 단위를 잘못 안 것(초로 적음 등)이다
export const MAX_WORKOUT_MINUTES = 1440;
// 하루 자전거 장거리까지 넉넉히. 0을 하나 더 누르는 오타는 막는다
export const MAX_WORKOUT_DISTANCE_KM = 300;
// 러닝 기록은 보통 0.1km 단위 (5.2km)
export const WORKOUT_DISTANCE_DECIMALS = 1;

// 배열 순서 = 폼의 입력칸 순서 (시안: 종목 → 시간 → 거리)
export const WORKOUT_FIELDS = [
  customSelectField({
    name: 'activity',
    label: '종목',
    options: WORKOUT_ACTIVITIES,
    maxLength: MAX_WORKOUT_ACTIVITY_LENGTH,
  }),
  numberField({
    name: 'minutes',
    label: '시간',
    unit: '분',
    max: MAX_WORKOUT_MINUTES,
  }),
  optional(
    numberField({
      name: 'distance',
      label: '거리',
      unit: 'km',
      max: MAX_WORKOUT_DISTANCE_KM,
      decimals: WORKOUT_DISTANCE_DECIMALS,
    }),
  ),
] satisfies readonly FieldDef[];

export const workoutFieldsSchema = toFieldsSchema(WORKOUT_FIELDS);
export type WorkoutFields = z.infer<typeof workoutFieldsSchema>;
