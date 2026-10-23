import { z } from 'zod';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import { MAX_TAG_LENGTH } from '@/features/records/schema/recordEntry';
import type { RecordType } from '@/features/records/schema/recordTypes';
import { getFilterFields } from '@/features/search/searchFilters';

// 사용자가 직접 만든 이름(선택 칸의 직접 입력값, 태그)을 AI에 보내기 위해 모은다 (2026-10-23 사용자 결정).
// 이유: AI가 "Ott" 같은 분류가 있는지 몰라 추측만 했다. 이름을 알면 정확한 칸 조건으로 잡는다.
// 선 (사용자 결정): 이름 문자열만, 칸마다·태그 각각 최대 50개. 사용 횟수와 기록 내용(금액·메모·제목·날짜·건수)은 보내지 않는다.
// 감수한 것: 이름 자체가 민감할 수 있다(예: 분류 "병원"). 나키 화면 안내 문구와 CLAUDE.md에 적어 두었다

export const MAX_NAMES_PER_FIELD = 50;
export const MAX_TAG_NAMES = 50;
// 직접 입력 선택 칸의 글자 상한(분류·종목 12자)보다 넉넉히. 서버가 받는 값의 상한이라 끝없이 받지 않게만
const MAX_NAME_LENGTH = 20;
// 직접 입력을 받는 칸 수(지금 3개: 분류·결제수단·종목)보다 넉넉히
const MAX_CUSTOM_FIELDS = 10;

const nameSchema = z.string().trim().min(1).max(MAX_NAME_LENGTH);

// 요청에 실리는 모양. 서버는 이 스키마로 다시 자른다 (브라우저가 보낸 개수·길이를 믿지 않는다)
export const nakiCustomNamesSchema = z.object({
  fields: z
    .array(
      z.object({
        // 타입·칸 이름은 문자열로 받고, 쓰는 쪽(describeTypesForAi)이 켜진 타입의 칸과 맞춰 본다
        type: z.string().max(MAX_NAME_LENGTH),
        field: z.string().max(MAX_NAME_LENGTH),
        values: z.array(nameSchema).max(MAX_NAMES_PER_FIELD),
      }),
    )
    .max(MAX_CUSTOM_FIELDS),
  tags: z
    .array(z.string().trim().min(1).max(MAX_TAG_LENGTH))
    .max(MAX_TAG_NAMES),
});
export type NakiCustomNames = z.infer<typeof nakiCustomNamesSchema>;

export const EMPTY_CUSTOM_NAMES: NakiCustomNames = { fields: [], tags: [] };

// 최근 기록부터 훑어 이름을 모은다 (entries는 최신순이어야 한다: 50개를 넘으면 오래된 이름이 빠진다).
// 켜진 타입만, 검색 필터가 쓰는 칸(getFilterFields) 중 직접 입력을 받는 칸만, 기본 선택지에 이미 있는 값은 뺀다(이미 보낸다)
export function collectCustomNames(
  entries: readonly RecordEntry[],
  types: readonly RecordType[],
): NakiCustomNames {
  const fields = types.flatMap((type) =>
    getFilterFields(type)
      .filter(({ def, kind }) => kind === 'select' && def.allowCustom)
      .map(({ def }) => {
        const base = new Set(def.options ?? []);
        const values = new Set<string>();
        for (const entry of entries) {
          if (values.size >= MAX_NAMES_PER_FIELD) break;
          if (entry.type !== type) continue;
          const raw = (entry.fields as Record<string, unknown>)[def.name];
          const value = typeof raw === 'string' ? raw.trim() : '';
          // 서버 상한을 넘는 이름 하나 때문에 요청 전체가 거절되지 않게 모을 때 뺀다 (저장 상한 12자라 보통은 없다)
          if (value && value.length <= MAX_NAME_LENGTH && !base.has(value)) {
            values.add(value);
          }
        }
        return { type, field: def.name, values: [...values] };
      })
      .filter((item) => item.values.length > 0),
  );
  const tags = new Set<string>();
  for (const entry of entries) {
    if (!types.includes(entry.type)) continue;
    for (const tag of entry.tags) {
      if (tags.size >= MAX_TAG_NAMES) break;
      if (tag.trim() && tag.length <= MAX_TAG_LENGTH) tags.add(tag);
    }
    if (tags.size >= MAX_TAG_NAMES) break;
  }
  return { fields, tags: [...tags] };
}
