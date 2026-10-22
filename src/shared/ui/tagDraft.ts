import { removeWhitespace } from '@/shared/text/removeWhitespace';

// 태그 입력칸에 친 글자를 "확정된 태그"와 "아직 치는 중인 글자"로 나눈다.
// 공백을 치면 그 앞까지가 태그가 된다 (2026-10-22 사용자 결정: 스페이스는 태그 끝내기).
// 키 이벤트(keydown의 ' ')가 아니라 입력값으로 판단하는 이유: 한글 자판은 스페이스가 글자 조합 확정과 겹쳐
// keydown 때 isComposing이 참이라 놓칠 수 있고, 붙여 넣은 "출근길 단골 카페"도 같은 규칙으로 나눠야 한다
export type TagDraftResult = {
  tags: string[];
  draft: string;
};

export function splitTagDraft(
  raw: string,
  existing: readonly string[],
  maxTags: number,
): TagDraftResult {
  const parts = raw.split(/\s/);
  // 마지막 조각은 아직 치는 중이다 (공백으로 끝났으면 빈 글자)
  const draft = parts.pop() ?? '';
  const tags = [...existing];
  for (const part of parts) {
    const tag = removeWhitespace(part);
    // 빈 조각(연속 공백)·중복은 조용히 넘긴다. 개수가 차면 나머지는 버린다
    if (tag && !tags.includes(tag) && tags.length < maxTags) tags.push(tag);
  }
  return { tags, draft };
}
