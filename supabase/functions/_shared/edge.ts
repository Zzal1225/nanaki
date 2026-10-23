// Edge Function(Deno) 공통: cron 호출 확인, 관리자 키, JSON 응답.
// Deno 전역(Deno.env)을 써서 앱의 Node 타입 검사에서 뺀다 (tsconfig exclude). 순수 함수는 routineReminder.ts처럼 따로 둔다

// pg_cron(pg_net)만 부르게: Vault의 비밀 값과 같은 헤더만 받는다 (함수는 JWT 검사 없이 배포, config.toml).
// 비밀 값 이름이 reminder인 이유: 루틴 알림(35b)에서 처음 만들었고, 사진 정리(37b)도 같은 값을 쓴다
export function isCronRequest(request: Request): boolean {
  const secret = Deno.env.get('REMINDER_CRON_SECRET');
  return Boolean(secret) && request.headers.get('x-reminder-secret') === secret;
}

// 관리자 키: Supabase가 Edge Function에 기본으로 넣어 준다. 새 키 체계(sb_secret_)면 SUPABASE_SECRET_KEYS(JSON)에, 옛 키면 SUPABASE_SERVICE_ROLE_KEY에
export function readServiceKey(): string | null {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (keys) {
    try {
      const parsed = JSON.parse(keys) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // 아래 옛 키로
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? null;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
