// 한글 음절은 U+AC00(가)부터 받침 28가지 × 중성 21가지 × 초성 19가지 순서로 놓여 있다.
// (글자 코드 - 0xAC00) % 28 이 0이면 받침이 없다
const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const FINAL_CONSONANT_COUNT = 28;

// '금액' → '금액을', '분류' → '분류를'.
// 오류 문구를 필드 이름으로 만들 때 "금액를 입력해 주세요" 같은 어색한 조사를 피하려고 쓴다
export function withObjectParticle(word: string): string {
  const lastCode = word.charCodeAt(word.length - 1);
  const isHangul = lastCode >= HANGUL_START && lastCode <= HANGUL_END;
  // 한글이 아니면(영문·숫자 끝) 받침을 판단할 수 없어서 둘 다 적는다
  if (!isHangul) return `${word}을(를)`;

  const hasFinalConsonant =
    (lastCode - HANGUL_START) % FINAL_CONSONANT_COUNT !== 0;
  return `${word}${hasFinalConsonant ? '을' : '를'}`;
}
