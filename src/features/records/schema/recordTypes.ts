import { BODY_FIELDS } from './body';
import { EXPENSE_FIELDS } from './expense';
import {
  bodyFormSchema,
  expenseRecordSchema,
  reviewRecordSchema,
  workoutFormSchema,
} from './recordEntry';
import { REVIEW_FIELDS } from './review';
import { WORKOUT_FIELDS } from './workout';

// 작성 폼의 제목 칸. 타입마다 있고 없음이 달라서 폼이 if (type === ...) 대신 이 값을 읽는다.
// 운동·체형은 제목 칸이 없다 (2026-10-22 사용자 결정): 종목·잰 항목이 곧 이름이고, 폼 스키마가 그 이름으로 채운다
const REQUIRED_TITLE = {
  isHidden: false,
  placeholder: '제목을 입력하세요',
} as const;
const HIDDEN_TITLE = { isHidden: true, placeholder: '' } as const;

// 타입마다 다른 것은 모두 여기 모은다. 폼·목록은 이 설정만 보고 그려서 컴포넌트에 타입별 분기가 없다.
// 새 타입(루틴)은 여기에 한 줄 추가하는 것으로 시작한다
export const RECORD_TYPE_CONFIG = {
  expense: {
    label: '가계부',
    // 새로 쓰기 메뉴·폼 제목. 시안: 글을 남기는 타입은 "쓰기", 수치를 재는 타입은 "기록"
    createLabel: '가계부 쓰기',
    fields: EXPENSE_FIELDS,
    title: REQUIRED_TITLE,
    // 작성 폼은 id를 보내지 않는다 (createRecord가 만든다)
    formSchema: expenseRecordSchema.omit({ id: true }),
  },
  review: {
    label: '후기',
    createLabel: '후기 쓰기',
    fields: REVIEW_FIELDS,
    title: REQUIRED_TITLE,
    formSchema: reviewRecordSchema.omit({ id: true }),
  },
  workout: {
    label: '운동',
    createLabel: '운동 기록',
    fields: WORKOUT_FIELDS,
    // 종목 이름이 제목이 된다 (workoutFormSchema)
    title: HIDDEN_TITLE,
    formSchema: workoutFormSchema,
  },
  body: {
    label: '체형',
    createLabel: '체형 기록',
    fields: BODY_FIELDS,
    // 잰 항목 이름("체중" / "허리둘레")이 제목이 된다 (bodyFormSchema)
    title: HIDDEN_TITLE,
    formSchema: bodyFormSchema,
  },
} as const;

export type RecordType = keyof typeof RECORD_TYPE_CONFIG;

// 주소의 ?type= 값은 누구나 고쳐 칠 수 있고 string[](?type=a&type=b)이나 undefined로도 온다
export function parseRecordType(value: unknown): RecordType | null {
  // in 대신 Object.hasOwn: in은 모든 객체가 물려받는 'toString', 'constructor'도 true라서 막지 못한다
  if (typeof value !== 'string' || !Object.hasOwn(RECORD_TYPE_CONFIG, value)) {
    return null;
  }

  // 설정 객체가 직접 가진 키임을 위에서 확인했으므로 RecordType 중 하나다
  return value as RecordType;
}
