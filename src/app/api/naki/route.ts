import { NextResponse } from 'next/server';
import { nakiQuotaSchema } from '@/features/naki/nakiApi';
import { handleNakiQuestion } from '@/features/naki/server/handleNakiQuestion';
import {
  askNakiModel,
  isNakiModelConfigured,
} from '@/features/naki/server/nakiModel';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseSecretKey } from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// 나키 API. AI 키는 서버에만 있어서 브라우저는 이 주소로만 묻는다 (CLAUDE.md).
// 처리 순서·실패 처리는 handleNakiQuestion에 있고, 여기서는 진짜 세션·DB 함수·AI를 연결만 한다

// AI 응답을 기다리는 최대 시간. 넘으면 실패로 보고 횟수를 되돌린다 (무료 등급은 가끔 오래 걸린다)
const MODEL_TIMEOUT_MS = 20_000;

// 다른 사이트가 사용자 몰래 이 주소로 질문을 보내 횟수를 쓰게 하는 것을 막는다 (계정 삭제 API와 같은 확인)
function isSameOrigin(request: Request): boolean {
  return request.headers.get('origin') === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'badRequest' }, { status: 403 });
  }
  if (!isNakiModelConfigured()) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  const body: unknown = await request.json().catch(() => null);
  const supabase = await createSupabaseServerClient();
  const secretKey = getSupabaseSecretKey();

  const result = await handleNakiQuestion(body, {
    getUserId: async () => {
      const { data, error } = await supabase.auth.getUser();
      return error ? null : (data.user?.id ?? null);
    },
    useQuota: async () => {
      const { data, error } = await supabase.rpc('use_ai_quota');
      if (error) throw error;
      return data;
    },
    refundQuota: async (userId) => {
      // 관리자 키가 없는 환경(일부 미리보기)에서는 되돌리지 못한다. 횟수가 1 더 쓰일 뿐 기능은 그대로다
      if (!secretKey) return;
      await createSupabaseAdminClient(secretKey).rpc('refund_ai_quota', {
        p_user_id: userId,
      });
    },
    // 사용자가 "중단"하면(요청 취소) AI 호출도 멈춘다
    askModel: ({ question, instructions }) =>
      askNakiModel({
        question,
        instructions,
        signal: AbortSignal.any([
          request.signal,
          AbortSignal.timeout(MODEL_TIMEOUT_MS),
        ]),
      }),
  });

  return NextResponse.json(result.body, { status: result.status });
}

// 오늘 남은 횟수 (화면 머리 "오늘 N/20회")
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'signedOut' }, { status: 401 });
  }
  // 표를 돌려주는 함수라 배열로 온다 (한 줄)
  const { data, error } = await supabase.rpc('get_ai_quota');
  const row = data?.[0];
  if (error || !row) {
    return NextResponse.json({ error: 'model' }, { status: 500 });
  }
  const quota = nakiQuotaSchema.parse({
    remaining: row.remaining,
    limit: row.day_limit,
  });
  return NextResponse.json(quota);
}
