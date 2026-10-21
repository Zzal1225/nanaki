import { RECORD_TYPE_CONFIG, type RecordType } from '../schema/recordTypes';

// 자주 쓰는 순서. 모바일 스피드 다이얼은 이 순서를 아래에서 위로 쌓아 첫 번째(가계부)가 엄지에 가장 가깝다 (시안 3번).
// 운동·루틴·체형은 step2에서 여기와 RECORD_TYPE_CONFIG에 함께 추가한다
const NEW_RECORD_ORDER: readonly RecordType[] = ['expense', 'review'];

export type NewRecordMenuItem = {
  type: RecordType;
  label: string;
  href: string;
};

// 작성 화면 주소는 이 함수 한 곳에서만 만든다. 주소 모양이 바뀌어도 메뉴·버튼을 하나씩 고치지 않게
export function newRecordHref(type: RecordType): string {
  return `/records/new?type=${type}`;
}

// 설정의 타입 켜기/끄기(step1 설정 화면)가 생기면 여기서 꺼진 타입을 거른다
export const NEW_RECORD_MENU_ITEMS: readonly NewRecordMenuItem[] =
  NEW_RECORD_ORDER.map((type) => ({
    type,
    label: `${RECORD_TYPE_CONFIG[type].label} 쓰기`,
    href: newRecordHref(type),
  }));
