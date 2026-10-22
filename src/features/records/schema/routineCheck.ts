import { z } from 'zod';
import type { FieldDef } from './fieldKinds';

// 루틴 체크 = 루틴 하나 × 하루의 수행 결과 (records, type = 'routine'). 규칙은 routines 테이블에 따로 있다 (23a).
// 이 기록은 작성 폼으로 쓰지 않는다: 홈 하루 요약·루틴 상세의 체크 버튼이 만들고 고친다 (recordStore.setRoutineCheck)

// 횟수형 목표의 상한과 같다 (routines의 MAX_COUNT_TARGET). 목표를 넘겨 더 한 날도 적을 수 있게 목표가 아니라 상한으로 막는다
export const MAX_ROUTINE_CHECK_COUNT = 99;
export const MAX_ROUTINE_CHECK_UNIT_LENGTH = 6;

// - routineId: 어느 루틴의 체크인지. 루틴 이름이 바뀌어도 이어지게 이름이 아니라 id로 잇는다
// - count: 그날 한 횟수. 체크형은 1, 횟수형은 1~99. 0은 저장하지 않는다 (체크를 풀면 기록을 지운다)
// - target·unit: 체크한 그날의 목표("8잔")를 함께 남긴다.
//   기록 하나만으로 "5/8잔"을 그릴 수 있고, 나중에 목표를 바꿔도 지난 날의 완료 여부가 바뀌지 않는다
//   (반복 요일은 루틴 쪽 규칙을 그대로 쓴다: 23a에서 감수한 점)
export const routineCheckFieldsSchema = z.object({
  routineId: z.uuid(),
  count: z.int().min(1).max(MAX_ROUTINE_CHECK_COUNT),
  target: z.int().min(1).max(MAX_ROUTINE_CHECK_COUNT),
  unit: z.string().max(MAX_ROUTINE_CHECK_UNIT_LENGTH),
});
export type RoutineCheckFields = z.infer<typeof routineCheckFieldsSchema>;

// 그날 목표를 채웠는가 (달성률의 "완료")
export function isCheckDone(fields: RoutineCheckFields): boolean {
  return fields.count >= fields.target;
}

// 목록·상세 값: 체크형(목표 1)은 "완료", 횟수형은 "5/8잔"
export function formatCheckProgress(fields: RoutineCheckFields): string {
  return fields.target === 1
    ? '완료'
    : `${fields.count}/${fields.target}${fields.unit}`;
}

// 작성 폼·상세 표가 그릴 칸은 없다 (폼으로 쓰지 않고, 상세는 크게 보여 준 "5/8잔"이 전부다)
export const ROUTINE_CHECK_FIELDS = [] as const satisfies readonly FieldDef[];
