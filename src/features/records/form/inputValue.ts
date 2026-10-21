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

// 소수 칸(거리 5.5km): 입력 중인 글자와 폼 값을 함께 돌려준다.
// 정수 칸처럼 값만 들고 다시 그리면 "5."를 치는 순간 5로 바뀌어 점이 사라져서, 다음 숫자를 칠 수 없다.
// 그래서 글자는 입력칸이 따로 들고(DecimalInput), 여기서는 정리한 글자와 숫자 값을 함께 만든다.
// - 숫자와 첫 번째 점만 남긴다 (쉼표·단위·두 번째 점은 버림)
// - 소수 자리가 넘치면 잘라 낸다 (decimals = 1이면 5.55 → 5.5). 반올림하지 않는 이유: 치는 중에 앞자리가 바뀌면 헷갈린다
export function parseDecimalInput(
  text: string,
  decimals: number,
): { text: string; value: number | undefined } {
  const [whole = '', ...rest] = text.replace(/[^\d.]/g, '').split('.');
  const hasPoint = rest.length > 0;
  const fraction = rest.join('').slice(0, decimals);
  const cleaned = hasPoint ? `${whole}.${fraction}` : whole;
  // 숫자가 하나도 없으면(빈 칸, '.'만) 값 없음. Number('.')는 NaN이다
  const value = /\d/.test(cleaned) ? Number(cleaned) : undefined;
  return { text: cleaned, value };
}

// 소수 칸 처음 표시: 5.5 → '5.5'. 쉼표는 붙이지 않는다 (거리·무게는 천 단위까지 갈 일이 없고, 입력 중 글자와 모양을 맞춘다)
export function formatDecimalInput(value: unknown): string {
  return typeof value === 'number' ? String(value) : '';
}
