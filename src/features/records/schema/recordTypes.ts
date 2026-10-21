import { EXPENSE_FIELDS } from './expense';
import {
  expenseRecordSchema,
  reviewRecordSchema,
  workoutFormSchema,
} from './recordEntry';
import { REVIEW_FIELDS } from './review';
import { WORKOUT_FIELDS } from './workout';

// 작성 폼의 제목 칸. 타입마다 필수 여부와 안내 문구가 달라서 폼이 if (type === ...) 대신 이 값을 읽는다
const REQUIRED_TITLE = {
  isOptional: false,
  placeholder: '제목을 입력하세요',
} as const;

// 타입마다 다른 것은 모두 여기 모은다. 폼·목록은 이 설정만 보고 그려서 컴포넌트에 타입별 분기가 없다.
// 새 타입(루틴·체형)은 여기에 한 줄 추가하는 것으로 시작한다
export const RECORD_TYPE_CONFIG = {
  expense: {
    label: '가계부',
    fields: EXPENSE_FIELDS,
    title: REQUIRED_TITLE,
    // 작성 폼은 id를 보내지 않는다 (createRecord가 만든다)
    formSchema: expenseRecordSchema.omit({ id: true }),
  },
  review: {
    label: '후기',
    fields: REVIEW_FIELDS,
    title: REQUIRED_TITLE,
    formSchema: reviewRecordSchema.omit({ id: true }),
  },
  workout: {
    label: '운동',
    fields: WORKOUT_FIELDS,
    // 비우면 폼 스키마가 종목 이름으로 채운다 (workoutFormSchema)
    title: { isOptional: true, placeholder: '비우면 종목 이름으로 저장해요' },
    formSchema: workoutFormSchema,
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
