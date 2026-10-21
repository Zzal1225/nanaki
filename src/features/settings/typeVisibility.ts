import { RECORD_TYPE_ORDER } from '@/features/records/entry/newRecordMenu';
import type { RecordType } from '@/features/records/schema/recordTypes';

// 숨긴 타입 목록(DB user_settings.hidden_types)을 다루는 순수 함수.
// 목록은 string[] 그대로 둔다: DB에는 앱에 아직 없는 타입 이름('workout' 등, step2)이 있을 수 있는데,
// RecordType으로 걸러 저장하면 다른 기기(새 버전)에서 숨긴 값이 이 기기(옛 버전)의 저장 한 번에 지워진다

// 켜진 타입. 순서는 작성 메뉴·기록 탭·캘린더와 같은 RECORD_TYPE_ORDER
export function getVisibleTypes(hiddenTypes: readonly string[]): RecordType[] {
  return RECORD_TYPE_ORDER.filter((type) => !hiddenTypes.includes(type));
}

// 마지막 하나 남은 타입은 끌 수 없다. 다 끄면 작성 메뉴가 비어 아무것도 쓸 수 없는 앱이 된다
export function canHideType(
  hiddenTypes: readonly string[],
  type: RecordType,
): boolean {
  const visible = getVisibleTypes(hiddenTypes);
  return !visible.includes(type) || visible.length > 1;
}

// 한 타입을 숨기거나 다시 보이게 한 새 목록. 같은 이름이 두 번 들어가지 않게 한다
export function setTypeHidden(
  hiddenTypes: readonly string[],
  type: RecordType,
  isHidden: boolean,
): string[] {
  const others = hiddenTypes.filter((name) => name !== type);
  return isHidden ? [...others, type] : others;
}

// 숨긴 타입의 기록을 뺀다 (기록 탭·캘린더). 데이터는 지우지 않고 화면에서만 빠진다
export function filterVisibleEntries<T extends { type: RecordType }>(
  entries: readonly T[],
  visibleTypes: readonly RecordType[],
): T[] {
  return entries.filter((entry) => visibleTypes.includes(entry.type));
}
