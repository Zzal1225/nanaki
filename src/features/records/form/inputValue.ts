// 입력칸(글자) ↔ 폼 값 변환. 컴포넌트에서 떼어 순수 함수로 두면 경계 사례를 단위 테스트할 수 있다

// 숫자 칸: 숫자가 아닌 글자(쉼표, 원, 공백)는 버리고 정수로 만든다.
// 빈 칸은 0이 아니라 undefined: 0으로 바꾸면 "입력 안 함"과 "0원 입력"이 구분되지 않아
// 필수 칸 오류 대신 "0보다 커야 한다"는 엉뚱한 오류가 나온다
export function parseNumberInput(text: string): number | undefined {
  const digits = text.replace(/\D/g, '');
  return digits === '' ? undefined : Number(digits);
}

// 숫자 칸 표시: 12500 → '12,500'. 값이 없으면 빈 칸
export function formatNumberInput(value: unknown): string {
  return typeof value === 'number' ? value.toLocaleString('ko-KR') : '';
}

// 글자 칸: 빈 칸('')은 undefined.
// optional()은 "값 없음(undefined)"만 허용하고 ''는 min(1)에 걸려 실패하기 때문이다
export function emptyToUndefined(text: string): string | undefined {
  return text === '' ? undefined : text;
}

// 메모: DB에서 "없음"은 null이라(nullable) 빈 칸은 null로 보낸다
export function emptyToNull(text: string): string | null {
  return text === '' ? null : text;
}
