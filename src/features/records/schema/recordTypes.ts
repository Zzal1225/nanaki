import type { PhotoKind } from './photoKinds';
import type { RecordEntry } from './recordEntry';
import { BODY_CONTENT_HINT, BODY_FIELDS } from './body';
import { EXPENSE_FIELDS } from './expense';
import {
  bodyFormSchema,
  bodyFormSchemaFor,
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
    // 검색 필터 시트에 나오는 칸 (2026-10-22 사용자 결정, 시안 14b). 칸 모양은 필드 정의(kind)에서 정해진다
    filterFields: ['amount', 'category', 'paymentMethod'],
    title: REQUIRED_TITLE,
    // 작성 폼은 id를 보내지 않는다 (createRecord가 만든다)
    formSchema: expenseRecordSchema.omit({ id: true }),
  },
  review: {
    label: '후기',
    createLabel: '후기 쓰기',
    fields: REVIEW_FIELDS,
    filterFields: ['rating', 'targetKind'],
    title: REQUIRED_TITLE,
    formSchema: reviewRecordSchema.omit({ id: true }),
  },
  workout: {
    label: '운동',
    createLabel: '운동 기록',
    fields: WORKOUT_FIELDS,
    // 거리는 넣지 않는다: 거리가 없는 운동(헬스·요가)이 많아 범위로 거르면 대부분 빠진다
    filterFields: ['activity', 'minutes'],
    // 종목 이름이 제목이 된다 (workoutFormSchema)
    title: HIDDEN_TITLE,
    formSchema: workoutFormSchema,
  },
  body: {
    label: '체형',
    createLabel: '체형 기록',
    fields: BODY_FIELDS,
    // 체형·루틴은 기간만 (값으로 거를 일이 드물다)
    filterFields: [],
    // 잰 항목 이름("체중" / "허리둘레")이 제목이 된다 (bodyFormSchema)
    title: HIDDEN_TITLE,
    formSchema: bodyFormSchema,
    // 눈바디 (step4): 정면·측면 한 장씩
    photoKinds: ['front', 'side'],
    // 2026-10-24 사용자 결정: 칸마다 "(선택)" 대신 위에 한 줄, 태그·메모는 쓰지 않는다 (재는 값과 사진만 남기는 기록)
    contentHint: BODY_CONTENT_HINT,
    hidesTagsAndMemo: true,
    // 사진 장수를 알아야 "1개 이상"을 검사한다 (사진은 폼 값이 아니다)
    formSchemaWithPhotos: bodyFormSchemaFor,
  },
  // 루틴 체크 기록. 다른 타입과 달리 작성 폼으로 쓰지 않는다:
  // "새로 쓰기"는 루틴(규칙) 만들기 화면으로 가고(createHref), 체크는 홈·루틴 상세의 체크 버튼이 만든다.
  // 그래서 기록 상세에서도 수정 버튼을 두지 않는다(isEditable)
  routine: {
    label: '루틴',
    createLabel: '루틴 만들기',
    createHref: '/routines/new',
    isEditable: false,
    // 매일 쌓이는 체크라 "최근 기록"·하루 요약의 기록 줄에 넣으면 다른 기록을 밀어낸다.
    // 체크는 그날 일정에서 그리는 홈 루틴 줄과 루틴 상세에서 본다 (2026-10-22 사용자 결정)
    isScheduleDriven: true,
    fields: ROUTINE_CHECK_FIELDS,
    filterFields: [],
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
  isScheduleDriven?: boolean;
  fields: readonly unknown[];
  filterFields: readonly string[];
  title: { isHidden: boolean; placeholder: string };
  formSchema: unknown;
  // 이 타입에 붙는 사진 칸 (step4, 종류마다 한 장). 없으면 사진 없음
  photoKinds?: readonly PhotoKind[];
  // 폼 위 안내 한 줄. 있으면 칸마다 "(선택)"을 붙이지 않는다 (무엇이 필요한지 이 한 줄이 말한다)
  contentHint?: string;
  // 태그·메모 칸을 그리지 않는다. 예전에 적힌 값은 고쳐 저장해도 그대로 남는다 (폼 처음 값에 들어 있다)
  hidesTagsAndMemo?: boolean;
  // 사진 장수를 받아 폼 스키마를 만든다 (사진이 내용으로 쳐지는 타입). 없으면 formSchema 그대로
  formSchemaWithPhotos?: (photoCount: number) => unknown;
};

// 타입이 정한 칸 중 하나라도 채워졌는지. 아니면 이 기록의 내용은 사진뿐이다 (체형: 체중·허리둘레 없이 눈바디만).
// 타입 이름으로 가르지 않고 칸 정의로 본다: 필수 칸이 있는 타입(가계부·후기)은 늘 참이다
export function hasFieldValues(entry: RecordEntry): boolean {
  const config: RecordTypeConfig = RECORD_TYPE_CONFIG[entry.type];
  const fields = entry.fields as Record<string, unknown>;
  return (config.fields as readonly { name: string }[]).some(
    (field) => fields[field.name] !== undefined,
  );
}

// 폼 위 안내 한 줄 (없으면 null)
export function getContentHint(type: RecordType): string | null {
  const config: RecordTypeConfig = RECORD_TYPE_CONFIG[type];
  return config.contentHint ?? null;
}

// 폼 검사 스키마. photoCount를 주면(사진 칸이 있는 폼) 사진도 내용으로 치는 스키마를 쓴다.
// 형 변환: formSchemaWithPhotos는 같은 타입의 formSchema와 같은 모양을 돌려준다 (bodyFormSchema = bodyFormSchemaFor(0))
export function getFormSchema(
  type: RecordType,
  photoCount?: number,
): (typeof RECORD_TYPE_CONFIG)[RecordType]['formSchema'] {
  const config: RecordTypeConfig = RECORD_TYPE_CONFIG[type];
  if (photoCount !== undefined && config.formSchemaWithPhotos) {
    return config.formSchemaWithPhotos(
      photoCount,
    ) as (typeof RECORD_TYPE_CONFIG)[RecordType]['formSchema'];
  }
  return RECORD_TYPE_CONFIG[type].formSchema;
}

export function hidesTagsAndMemo(type: RecordType): boolean {
  const config: RecordTypeConfig = RECORD_TYPE_CONFIG[type];
  return config.hidesTagsAndMemo ?? false;
}

// 사진 칸 (없으면 빈 배열). createHref처럼 넓은 모양으로 읽는다
export function getPhotoKinds(type: RecordType): readonly PhotoKind[] {
  const config: RecordTypeConfig = RECORD_TYPE_CONFIG[type];
  return config.photoKinds ?? [];
}

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

// 기록이 아니라 일정(루틴 규칙)으로 그리는 타입. 홈 하루 요약은 기록 줄에서 빼고 일정 줄로 따로 그리고,
// 기록 탭 "최근 기록"에서는 뺀다. 캘린더 점·검색·타입 상세에는 그대로 나온다
export const SCHEDULE_DRIVEN_TYPES: readonly RecordType[] = (
  Object.keys(RECORD_TYPE_CONFIG) as RecordType[]
).filter((type) => {
  const config: RecordTypeConfig = RECORD_TYPE_CONFIG[type];
  return config.isScheduleDriven ?? false;
});

// 주소의 ?type= 값은 누구나 고쳐 칠 수 있고 string[](?type=a&type=b)이나 undefined로도 온다
export function parseRecordType(value: unknown): RecordType | null {
  // in 대신 Object.hasOwn: in은 모든 객체가 물려받는 'toString', 'constructor'도 true라서 막지 못한다
  if (typeof value !== 'string' || !Object.hasOwn(RECORD_TYPE_CONFIG, value)) {
    return null;
  }

  // 설정 객체가 직접 가진 키임을 위에서 확인했으므로 RecordType 중 하나다
  return value as RecordType;
}
