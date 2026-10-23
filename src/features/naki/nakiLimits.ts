// 나키 하루 횟수 규칙 (2026-10-23 사용자 결정): 로그인 계정 10회 · 체험(익명) 계정 3회 · 서비스 전체 200회.
// 숫자는 서버 환경 변수로 바꿀 수 있다 (무료 등급 한도가 바뀌면 배포 없이 환경 변수만). 세는 일은 DB 함수 use_ai_quota.
// 순수 함수라 날짜 경계·환경 변수 해석을 서버·DB 없이 테스트한다

export type NakiLimits = { user: number; guest: number; global: number };

export const DEFAULT_NAKI_LIMITS: NakiLimits = {
  user: 10,
  guest: 3,
  global: 200,
};

// 양의 정수만 받는다. 비었거나 틀리면 기본값 (오타로 한도가 0이 되어 나키가 멈추지 않게)
function readLimit(value: string | undefined, fallback: number): number {
  if (!value || !/^\d+$/.test(value.trim())) return fallback;
  const number = Number(value.trim());
  return number > 0 ? number : fallback;
}

export function readNakiLimits(
  env: Record<string, string | undefined>,
): NakiLimits {
  return {
    user: readLimit(env.NAKI_DAILY_LIMIT_USER, DEFAULT_NAKI_LIMITS.user),
    guest: readLimit(env.NAKI_DAILY_LIMIT_GUEST, DEFAULT_NAKI_LIMITS.guest),
    global: readLimit(env.NAKI_DAILY_LIMIT_GLOBAL, DEFAULT_NAKI_LIMITS.global),
  };
}

// 한국 시간은 서머타임이 없어 늘 UTC+9
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DATE_LENGTH = 'YYYY-MM-DD'.length;

// 하루 = 한국 날짜. 서버(Vercel)는 UTC라 now.toISOString()을 그대로 쓰면 한국 오전 9시에 날이 바뀐다
export function toKstDate(now: Date): string {
  return new Date(now.getTime() + KST_OFFSET_MS)
    .toISOString()
    .slice(0, DATE_LENGTH);
}

export type QuotaResult =
  | { kind: 'ok'; remaining: number }
  | { kind: 'userLimit' }
  | { kind: 'globalLimit' };

// DB 함수 use_ai_quota의 답('ok:<남은 횟수>' / 'user_limit' / 'global_limit')을 읽는다. 모르는 답은 오류로
export function parseQuotaResult(value: string): QuotaResult {
  if (value === 'user_limit') return { kind: 'userLimit' };
  if (value === 'global_limit') return { kind: 'globalLimit' };
  const match = /^ok:(\d+)$/.exec(value);
  if (match) return { kind: 'ok', remaining: Number(match[1]) };
  throw new Error(`알 수 없는 횟수 결과: ${value}`);
}
