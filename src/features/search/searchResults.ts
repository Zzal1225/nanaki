import type { RecordEntry } from '@/features/records/schema/recordEntry';
import type { RecordType } from '@/features/records/schema/recordTypes';

// 타입 칩의 건수. 서버는 검색어로만 찾고(타입 무관), 타입별 건수와 거르기는 받은 결과로 계산한다 →
// 칩을 바꿀 때 요청이 다시 가지 않고, "운동 0"처럼 결과가 없는 칩을 미리 흐리게 보여 줄 수 있다
export function countByType(
  entries: readonly RecordEntry[],
  types: readonly RecordType[],
): Record<RecordType | 'all', number> {
  const counts = { all: 0 } as Record<RecordType | 'all', number>;
  for (const type of types) counts[type] = 0;
  for (const entry of entries) {
    // 숨긴 타입(설정에서 끈 타입)은 칩도 없고 전체 건수에도 넣지 않는다
    if (!types.includes(entry.type)) continue;
    counts[entry.type] += 1;
    counts.all += 1;
  }
  return counts;
}

export function filterByType(
  entries: readonly RecordEntry[],
  type: RecordType | null,
  types: readonly RecordType[],
): RecordEntry[] {
  return entries.filter((entry) =>
    type ? entry.type === type : types.includes(entry.type),
  );
}

export type TextPart = { text: string; isMatch: boolean };

// 결과 제목에서 검색어 부분을 강조하려고 나눈다 (시안 14a: 검색어에 옅은 배경).
// 대소문자를 가리지 않는다: DB 검색(imatch)과 같은 기준이라 "cafe"로 찾은 "Cafe"도 강조된다.
// 정규식 대신 indexOf: 검색어의 특수 글자(+, *)를 이스케이프할 필요가 없다.
// 함정: 소문자로 바꾸면 길이가 바뀌는 글자(터키어 İ 등)가 있으면 강조 위치가 어긋난다. 한글·영문 기록에는 일어나지 않아 감수한다
export function splitByKeyword(text: string, keyword: string): TextPart[] {
  if (!keyword) return [{ text, isMatch: false }];

  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const parts: TextPart[] = [];
  let start = 0;
  let index = lowerText.indexOf(lowerKeyword, start);
  while (index !== -1) {
    if (index > start)
      parts.push({ text: text.slice(start, index), isMatch: false });
    parts.push({
      text: text.slice(index, index + keyword.length),
      isMatch: true,
    });
    start = index + keyword.length;
    index = lowerText.indexOf(lowerKeyword, start);
  }
  if (start < text.length)
    parts.push({ text: text.slice(start), isMatch: false });
  return parts;
}
