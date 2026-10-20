// NEXT_PUBLIC_ 값은 빌드할 때 코드에 글자 그대로 박힌다. 그래서 process.env[name]처럼
// 변수로 꺼내면 브라우저에서 비어 있게 되고, 반드시 process.env.이름 형태로 써야 한다
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// 값이 없을 때 Supabase 내부의 알기 어려운 오류 대신, 무엇을 고쳐야 하는지 바로 알려 준다
export function getSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      'Supabase 환경변수가 없습니다. .env.example을 참고해 .env.local(로컬)과 Vercel 환경변수를 설정하세요.',
    );
  }
  return { url: SUPABASE_URL, publishableKey: SUPABASE_PUBLISHABLE_KEY };
}
