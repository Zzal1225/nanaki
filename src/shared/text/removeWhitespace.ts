// 글자 안의 모든 공백(띄어쓰기·줄바꿈·탭)을 뺀다.
// 쓰는 곳: 태그 저장(태그는 띄어쓰기 없는 한 단어), 검색 비교("편의점 간식"을 "편의점간식"으로도 찾게) (2026-10-22 사용자 결정)
// \s는 전각 공백(U+3000)까지 포함한다: 한글 자판에서 들어올 수 있다
const WHITESPACE = /\s+/g;

export function removeWhitespace(text: string): string {
  return text.replace(WHITESPACE, '');
}
