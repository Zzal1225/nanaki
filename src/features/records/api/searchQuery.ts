import { removeWhitespace } from '@/shared/text/removeWhitespace';
import type { FieldDef } from '../schema/fieldKinds';
import type { RecordEntry } from '../schema/recordEntry';
import { RECORD_TYPE_CONFIG, type RecordType } from '../schema/recordTypes';

// 검색어로 찾는 칸: 제목·메모·태그 + 선택 칸(분류·결제수단·대상·종목) (2026-10-22 사용자 결정, 태그는 같은 날 추가).
// 선택 칸 이름은 손으로 적지 않고 필드 정의에서 모은다 → 새 타입에 선택 칸이 생기면 검색 대상에 저절로 들어간다.
// 숫자 칸(금액·시간)은 글자 검색으로 찾을 일이 없어 넣지 않는다 (필터 시트의 범위 필터가 맡는다)
export const SEARCHABLE_FIELD_NAMES: readonly string[] = [
  ...new Set(
    (Object.keys(RECORD_TYPE_CONFIG) as RecordType[]).flatMap((type) =>
      (RECORD_TYPE_CONFIG[type].fields as readonly FieldDef[])
        .filter((field) => field.kind === 'select')
        .map((field) => field.name),
    ),
  ),
];

// 검색어 길이 상한. 주소에 그대로 실린다
export const MAX_SEARCH_KEYWORD_LENGTH = 50;

// 기록 하나가 검색어를 포함하는지 (대소문자·공백 무시, 그 밖의 글자는 그대로).
// 25b부터 검색은 기기 사본(IndexedDB)에서 한다 → 오프라인에서도 찾는다.
// 예전(24a)에는 서버(PostgREST imatch)에서 찾아서 정규식·따옴표 이스케이프가 필요했는데,
// 여기서는 includes라 특수 글자(* + , ")를 따로 막을 필요가 없다
// 공백을 빼고 비교한다 (2026-10-22 사용자 결정): "편의점 간식"을 "편의점간식"으로, "편의점간식"을 "편의점 간식"으로도 찾는다.
// 정규화한 글자를 저장해 두지 않고 비교할 때 만든다: 검색은 기기 사본에서 하고 기록은 많아야 수천 개라 빠르고,
// 저장해 두면 오프라인에서 쓴 기록·예전 기록마다 그 칸을 채워야 해서 틀릴 곳이 생긴다
function normalize(text: string): string {
  return removeWhitespace(text).toLowerCase();
}

// 검색어로 보는 칸만 가진 모양. 검사한 기록(RecordEntry)과 기기 사본의 줄(검사 전) 둘 다 맞는다:
// 검색은 줄 단계에서 먼저 걸러, 맞은 것만 스키마 검사를 한다 (recordStore.searchRecords, 41 1만 건 성능).
// fields는 검사 전이라 unknown — 칸마다 문자열인지 확인한 뒤에만 비교한다
export type KeywordSearchable = {
  title: string;
  memo: string | null;
  tags: readonly string[] | null;
  fields: unknown;
};

// 검색어 하나로 여러 기록을 볼 때 검색어 정규화를 한 번만 하려고 판별 함수를 만들어 돌려준다
export function createKeywordMatcher(
  keyword: string,
): (item: KeywordSearchable) => boolean {
  const needle = normalize(keyword);
  if (!needle) return () => true;
  return (item) => {
    const fields =
      typeof item.fields === 'object' && item.fields !== null
        ? (item.fields as Record<string, unknown>)
        : {};
    // 태그는 사용자가 직접 붙인 "찾기용 단어"라 검색에 넣는다. 태그 하나하나를 따로 비교한다 (이어 붙이면 경계를 넘어 맞는다)
    const texts = [
      item.title,
      item.memo,
      ...(item.tags ?? []),
      ...SEARCHABLE_FIELD_NAMES.map((name) => fields[name]),
    ];
    return texts.some(
      (text) => typeof text === 'string' && normalize(text).includes(needle),
    );
  };
}

export function matchesKeyword(entry: RecordEntry, keyword: string): boolean {
  return createKeywordMatcher(keyword)(entry);
}
