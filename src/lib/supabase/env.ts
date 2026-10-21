// NEXT_PUBLIC_ 값은 빌드할 때 코드에 글자 그대로 박힌다. 그래서 process.env[name]처럼
// 변수로 꺼내면 브라우저에서 비어 있게 되고, 반드시 process.env.이름 형태로 써야 한다
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// 관리자 권한 키. 브라우저로 가는 NEXT_PUBLIC_ 값에 들어가면 누구나 모든 데이터를 볼 수 있다
const SECRET_KEY_PREFIX = 'sb_secret_';

type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

export function getSupabaseEnv(): SupabaseEnv {
  return parseSupabaseEnv(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

// 값이 틀렸을 때 Supabase가 내는 오류는 원인과 동떨어져 있다
// (예: 주소 뒤에 /rest/v1이 붙으면 "No API key found"). 그래서 여기서 먼저 모양을 검사하고
// 무엇을 고쳐야 하는지 알려 준다. process.env와 떼어 놓은 이유는 테스트하기 위해서다
export function parseSupabaseEnv(
  rawUrl: string | undefined,
  rawKey: string | undefined,
): SupabaseEnv {
  // 대시보드에서 복사할 때 앞뒤 공백이 딸려 오기 쉽다
  const url = rawUrl?.trim();
  const publishableKey = rawKey?.trim();

  if (!url || !publishableKey) {
    throw new Error(
      'Supabase 환경변수가 없습니다. .env.example을 참고해 .env.local(로컬)과 Vercel 환경변수를 설정하세요.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL이 주소 모양이 아닙니다: "${url}". https://<project-ref>.supabase.co 형태로 넣으세요.`,
    );
  }

  // Data API 화면에 보이는 .../rest/v1/ 주소를 복사하면 로그인 요청이 엉뚱한 곳으로 간다
  if (parsed.pathname !== '/') {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL 뒤에 경로(${parsed.pathname})가 붙어 있습니다. https://<project-ref>.supabase.co까지만 넣으세요.`,
    );
  }

  if (publishableKey.startsWith(SECRET_KEY_PREFIX)) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY에 secret 키가 들어 있습니다. 브라우저에 노출되므로 즉시 publishable 키로 바꾸고, Supabase에서 secret 키를 새로 발급하세요.',
    );
  }

  // origin은 끝의 /를 뺀 https://<ref>.supabase.co만 남긴다
  return { url: parsed.origin, publishableKey };
}

// 관리자(secret) 키. 서버(Route Handler)에서만 읽는다. NEXT_PUBLIC_이 아니라서 브라우저 코드에는 아예 들어가지 않는다.
// 없으면 null: 키를 넣지 않은 환경(일부 미리보기)에서도 앱은 뜨고, 계정 삭제만 "지금은 할 수 없어요"로 안내한다
export function getSupabaseSecretKey(): string | null {
  return parseSupabaseSecretKey(process.env.SUPABASE_SECRET_KEY);
}

export function parseSupabaseSecretKey(
  rawKey: string | undefined,
): string | null {
  const key = rawKey?.trim();
  if (!key) return null;

  // publishable 키를 잘못 넣으면 관리자 요청이 권한 오류로 실패하는데, 오류 문구만으로는 원인을 알기 어렵다
  if (!key.startsWith(SECRET_KEY_PREFIX)) {
    throw new Error(
      'SUPABASE_SECRET_KEY가 secret 키(sb_secret_...) 모양이 아닙니다. Supabase → Project Settings → API Keys의 Secret keys에서 복사하세요.',
    );
  }
  return key;
}
