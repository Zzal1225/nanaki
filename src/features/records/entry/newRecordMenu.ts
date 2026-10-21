import { RECORD_TYPE_CONFIG, type RecordType } from '../schema/recordTypes';

// 자주 쓰는 순서. 기록 탭 카드도 이 순서. 모바일 스피드 다이얼은 이 순서를 아래에서 위로 쌓아 첫 번째(가계부)가 엄지에 가장 가깝다 (시안 3번).
// 운동·루틴·체형은 step2에서 여기와 RECORD_TYPE_CONFIG에 함께 추가한다
export const RECORD_TYPE_ORDER: readonly RecordType[] = ['expense', 'review'];

export type NewRecordMenuItem = {
  type: RecordType;
  label: string;
  href: string;
};

// 작성 화면 주소는 이 함수 한 곳에서만 만든다. 주소 모양이 바뀌어도 메뉴·버튼을 하나씩 고치지 않게.
// date: 홈에서 고른 날에 쓰기 시작하면 그 날짜를 미리 채운다 (없으면 폼이 오늘로)
export function newRecordHref(type: RecordType, date?: string): string {
  const params = new URLSearchParams({ type });
  if (date) params.set('date', date);
  return `/records/new?${params.toString()}`;
}

// 작성 메뉴 항목. 켜진 타입만 받는다: 설정에서 끈 타입은 메뉴에서 빠진다 (useNewRecordMenuItems).
// 상수가 아니라 함수인 이유: 켜진 타입은 사용자 설정(DB)이라 화면이 뜬 뒤에야 안다
export function getNewRecordMenuItems(
  types: readonly RecordType[],
  date?: string,
): NewRecordMenuItem[] {
  return types.map((type) => ({
    type,
    label: `${RECORD_TYPE_CONFIG[type].label} 쓰기`,
    href: newRecordHref(type, date),
  }));
}
