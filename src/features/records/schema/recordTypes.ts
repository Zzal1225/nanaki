import { BODY_FIELDS } from './body';
import { EXPENSE_FIELDS } from './expense';
import {
  bodyFormSchema,
  expenseRecordSchema,
  reviewRecordSchema,
  routineRecordSchema,
  workoutFormSchema,
} from './recordEntry';
import { REVIEW_FIELDS } from './review';
import { ROUTINE_CHECK_FIELDS } from './routineCheck';
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
  // 루틴 체크 기록. 다른 타입과 달리 작성 폼으로 쓰지 않는다:
  // "새로 쓰기"는 루틴(규칙) 만들기 화면으로 가고(createHref), 체크는 홈·루틴 상세의 체크 버튼이 만든다.
  // 그래서 기록 상세에서도 수정 버튼을 두지 않는다(isEditable)
  routine: {
    label: '루틴',
    createLabel: '루틴 만들기',
    createHref: '/routines/new',
    isEditable: false,
    fields: ROUTINE_CHECK_FIELDS,
    title: HIDDEN_TITLE,
    // 폼으로 쓰지 않지만 설정 모양을 맞춰 둔다 (폼 화면은 루틴 만들기로 돌려보낸다)
    formSchema: routineRecordSchema.omit({ id: true }),
  },
} as const satisfies Record<string, RecordTypeConfig>;

// 모든 타입 설정이 갖출 모양. createHref·isEditable은 루틴처럼 폼으로 쓰지 않는 타입만 바꾼다
type RecordTypeConfig = {
  label: string;
  createLabel: string;
  createHref?: string;
  isEditable?: boolean;
  fields: readonly unknown[];
  title: { isHidden: boolean; placeholder: string };
  formSchema: unknown;
};

// "새로 쓰기" 주소: 폼이 아닌 곳으로 가는 타입(루틴)은 그 주소를 쓴다.
// 설정을 넓은 모양(RecordTypeConfig)으로 받아 읽는다: as const 객체는 타입마다 모양이 달라
// createHref가 없는 타입에서 config.createHref를 읽으면 타입 오류가 난다
export function getCreateHref(type: RecordType): string | null {
  const config: RecordTypeConfig = RECORD_TYPE_CONFIG[type];
  return config.createHref ?? null;
}

// 기록 상세에서 수정 버튼을 보여 줄지 (루틴 체크는 체크 버튼으로만 바꾼다)
export function isEditableType(type: RecordType): boolean {
  const config: RecordTypeConfig = RECORD_TYPE_CONFIG[type];
  return config.isEditable ?? true;
}

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
