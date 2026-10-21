import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseSecretKey } from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// 계정 삭제 결과. 브라우저(deleteAccount)는 상태 코드로만 판단한다
const STATUS = {
  deleted: 204,
  notSignedIn: 401,
  otherOrigin: 403,
  failed: 500,
  // 이 환경에 secret 키가 없다 (일부 미리보기). 앱의 다른 기능은 그대로 쓸 수 있다
  unavailable: 503,
} as const;

// 다른 사이트가 사용자 몰래 이 주소로 요청을 보내는 것(CSRF)을 막는다. 세션 쿠키가 SameSite=Lax라
// 다른 사이트의 DELETE에는 쿠키가 실리지 않지만, 되돌릴 수 없는 일이라 Origin도 한 번 더 본다.
// 브라우저는 fetch DELETE에 Origin을 늘 붙인다
function isSameOrigin(request: Request): boolean {
  return request.headers.get('origin') === new URL(request.url).origin;
}

// 내 계정 지우기. auth.users 줄을 지우면 records·user_settings는 DB의 on delete cascade로 함께 지워진다.
// 브라우저 키(publishable)로는 사용자를 지울 수 없어서, 서버에서 secret 키로 한다.
// 누구를 지울지는 요청 본문이 아니라 로그인 세션에서만 정한다: 본문에 id를 받으면 남의 계정을 지울 수 있다
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return new NextResponse(null, { status: STATUS.otherOrigin });
  }

  const secretKey = getSupabaseSecretKey();
  if (!secretKey) {
    return new NextResponse(null, { status: STATUS.unavailable });
  }

  const supabase = await createSupabaseServerClient();
  // getClaims(토큰 서명만 확인)가 아니라 getUser(Supabase 서버에 확인): 되돌릴 수 없는 일이라
  // 이미 지워졌거나 막힌 사용자의 남은 토큰으로는 진행하지 않는다
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) {
    return new NextResponse(null, { status: STATUS.notSignedIn });
  }

  const admin = createSupabaseAdminClient(secretKey);
  const { error } = await admin.auth.admin.deleteUser(data.user.id);
  if (error) {
    // 사용자에게는 "다시 시도"만 보이므로, 원인은 서버 로그로 남긴다
    console.error('[account] 계정 삭제 실패', error.message);
    return new NextResponse(null, { status: STATUS.failed });
  }

  // 세션 쿠키를 지워 응답에 싣는다. 사용자는 이미 지워져서 Supabase 쪽 로그아웃 요청은 실패할 수 있는데,
  // 그래도 쿠키는 지워지고 브라우저도 한 번 더 지운다(deleteAccount). 여기서 실패했다고 삭제를 실패로 알리지 않는다
  await supabase.auth.signOut().catch(() => undefined);

  return new NextResponse(null, { status: STATUS.deleted });
}
