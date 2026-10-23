import { NextResponse } from 'next/server';
import {
  parseQuotaResult,
  readNakiLimits,
  toKstDate,
} from '@/features/naki/nakiLimits';
import type { NakiQuota } from '@/features/naki/nakiApi';
import { handleNakiQuestion } from '@/features/naki/server/handleNakiQuestion';
import {
  askNakiModel,
  isNakiModelConfigured,
} from '@/features/naki/server/nakiModel';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseSecretKey } from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// 나키 API. AI 키는 서버에만 있어서 브라우저는 이 주소로만 묻는다 (CLAUDE.md).
// 처리 순서·실패 처리는 handleNakiQuestion에 있고, 여기서는 진짜 세션·DB 함수·AI를 연결만 한다.
// 횟수 함수는 관리자 키로만 부른다 (한도 숫자를 인자로 받는 함수라 사용자에게 열지 않는다, 마이그레이션 설명).
// 관리자 키가 없는 환경이면 나키를 쓸 수 없다고 알린다 (횟수를 셀 수 없는데 AI를 부르면 무료 한도가 무방비)

// AI 응답을 기다리는 최대 시간. 넘으면 실패로 보고 횟수를 되돌린다 (무료 등급은 가끔 오래 걸린다)
const MODEL_TIMEOUT_MS = 20_000;

// 다른 사이트가 사용자 몰래 이 주소로 질문을 보내 횟수를 쓰게 하는 것을 막는다 (계정 삭제 API와 같은 확인)
function isSameOrigin(request: Request): boolean {
  return request.headers.get('origin') === new URL(request.url).origin;
}

async function getSessionUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, isGuest: data.user.is_anonymous === true };
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'badRequest' }, { status: 403 });
  }
  const secretKey = getSupabaseSecretKey();
  if (!isNakiModelConfigured() || !secretKey) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  const body: unknown = await request.json().catch(() => null);
  const admin = createSupabaseAdminClient(secretKey);
  const limits = readNakiLimits(process.env);

  const result = await handleNakiQuestion(body, {
    getUser: getSessionUser,
    limits,
    today: toKstDate(new Date()),
    useQuota: async (userId, day, userLimit) => {
      const { data, error } = await admin.rpc('use_ai_quota', {
        p_user_key: userId,
        p_day: day,
        p_user_limit: userLimit,
        p_global_limit: limits.global,
      });
      if (error) throw error;
      return parseQuotaResult(data);
    },
    refundQuota: async (userId, day) => {
      await admin.rpc('refund_ai_quota', { p_user_key: userId, p_day: day });
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

// 오늘 남은 횟수 (화면 머리 "오늘 N/10회")
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'signedOut' }, { status: 401 });
  }
  const secretKey = getSupabaseSecretKey();
  if (!secretKey) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
  const limits = readNakiLimits(process.env);
  const limit = user.isGuest ? limits.guest : limits.user;
  const { data, error } = await createSupabaseAdminClient(secretKey).rpc(
    'get_ai_usage',
    { p_user_key: user.id, p_day: toKstDate(new Date()) },
  );
  if (error) {
    return NextResponse.json({ error: 'model' }, { status: 500 });
  }
  const quota: NakiQuota = {
    remaining: Math.max(limit - data, 0),
    limit,
    isGuest: user.isGuest,
  };
  return NextResponse.json(quota);
}
