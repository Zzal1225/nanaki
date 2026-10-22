import type { FieldDef } from '../schema/fieldKinds';
import { RECORD_TYPE_CONFIG, type RecordType } from '../schema/recordTypes';

// 검색어로 찾는 칸: 제목·메모 + 선택 칸(분류·결제수단·대상·종목) (2026-10-22 사용자 결정).
// 선택 칸 이름은 손으로 적지 않고 필드 정의에서 모은다 → 새 타입에 선택 칸이 생기면 검색 대상에 저절로 들어간다.
// 숫자 칸(금액·시간)은 글자 검색으로 찾을 일이 없어 넣지 않는다 (24b의 범위 필터가 맡는다)
export const SEARCHABLE_FIELD_NAMES: readonly string[] = [
  ...new Set(
    (Object.keys(RECORD_TYPE_CONFIG) as RecordType[]).flatMap((type) =>
      (RECORD_TYPE_CONFIG[type].fields as readonly FieldDef[])
        .filter((field) => field.kind === 'select')
        .map((field) => field.name),
    ),
  ),
];

// 검색어 길이 상한. 주소에 그대로 실리고 매 글자가 DB 비교라, 문장 하나 정도로 막는다
export const MAX_SEARCH_KEYWORD_LENGTH = 50;

// 사용자가 친 글자를 정규식의 "글자 그대로"로 만든다 (영문·숫자·한글이 아닌 글자 앞에 \).
// ilike(LIKE)를 쓰지 않은 이유: PostgREST는 like 값 안의 *를 %(아무 글자들)로 바꿔서,
// "*"를 친 사용자에게 모든 기록이 나온다. *를 막을 방법이 LIKE에는 없다. 정규식(imatch)은 \*로 막힌다
export function escapeRegex(keyword: string): string {
  return keyword.replace(/[.*+?^${}()|[\]\\]/g, (char) => `\\${char}`);
}

// PostgREST or 필터의 값 한 칸. 값에 , ( ) 가 있으면 필터 문법이 깨지므로 큰따옴표로 감싸고,
// 그 안의 " 와 \ 는 다시 \로 막는다 (PostgREST 따옴표 규칙). 정규식 이스케이프의 \도 여기서 한 번 더 막힌다:
// '1+1' → 정규식 1\+1 → PostgREST "1\\+1"
function quoteFilterValue(value: string): string {
  return `"${value.replace(/[\\"]/g, (char) => `\\${char}`)}"`;
}

// supabase .or()에 넣을 글자: 제목·메모·선택 칸 중 하나라도 검색어를 포함하면 맞음 (imatch = 대소문자 무시 정규식 ~*).
// fields->>category: jsonb 안의 글자 값을 꺼낸다. 그 칸이 없는 타입(후기의 category)은 null이라 그냥 안 맞는다
export function toKeywordFilter(keyword: string): string {
  const pattern = quoteFilterValue(escapeRegex(keyword));
  const columns = [
    'title',
    'memo',
    ...SEARCHABLE_FIELD_NAMES.map((name) => `fields->>${name}`),
  ];
  return columns.map((column) => `${column}.imatch.${pattern}`).join(',');
}
