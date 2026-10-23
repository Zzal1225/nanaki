// 루틴 알림 보내기 (35b). pg_cron이 10분마다 pg_net으로 부른다 (마이그레이션 20261023110000).
// 1) DB 함수가 지금 알릴 루틴을 고르며 "오늘 보냄" 표시를 남긴다 (겹쳐 돌아도 하루 한 번)
// 2) 그 사람의 모든 구독(기기)으로 보낸다 (CLAUDE.md: 구독은 기기 단위)
// 3) 푸시 서비스가 404·410으로 답한 구독은 지운다 (CLAUDE.md)
// 발송(RFC 8291 암호화 + VAPID 서명)은 @negrel/webpush (Deno·Web Crypto, 2026-10-23 사용자 승인).
// 이 파일은 Deno에서 돈다: 앱의 Node 타입 검사·ESLint 대상에서 빼고(tsconfig·eslint), 순수 함수는 _shared에 두어 앱 vitest가 테스트한다
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import * as webpush from 'jsr:@negrel/webpush@0.5.0';
import {
  buildReminderPayload,
  type DueReminder,
  isGoneStatus,
} from '../_shared/routineReminder.ts';

// 알림이 늦게 닿아도 의미 있는 시간: 1시간 넘게 꺼져 있던 기기에는 지난 알림을 보내지 않는다
const TTL_SECONDS = 60 * 60;

type SubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

// 관리자 키: Supabase가 Edge Function에 기본으로 넣어 준다. 새 키 체계(sb_secret_)면 SUPABASE_SECRET_KEYS(JSON)에, 옛 키면 SUPABASE_SERVICE_ROLE_KEY에
function readServiceKey(): string | null {
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  // pg_cron만 부르게: Vault의 비밀 값과 같은 헤더만 받는다 (함수는 JWT 검사 없이 배포한다, --no-verify-jwt)
  const secret = Deno.env.get('REMINDER_CRON_SECRET');
  if (!secret || request.headers.get('x-reminder-secret') !== secret) {
    return json({ error: 'unauthorized' }, 401);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = readServiceKey();
  const vapidJson = Deno.env.get('VAPID_KEYS');
  const contact = Deno.env.get('VAPID_CONTACT');
  if (!url || !serviceKey || !vapidJson || !contact) {
    return json({ error: 'not configured' }, 503);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  const { data: due, error: dueError } = await supabase.rpc(
    'claim_due_routine_reminders',
  );
  if (dueError) return json({ error: dueError.message }, 500);
  const reminders = (due ?? []) as DueReminder[];
  if (reminders.length === 0) return json({ due: 0, sent: 0, removed: 0 });

  const userIds = [...new Set(reminders.map((item) => item.user_id))];
  const { data: rows, error: subError } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', userIds);
  if (subError) return json({ error: subError.message }, 500);
  const subscriptions = (rows ?? []) as SubscriptionRow[];

  // 키는 JWK 한 쌍(JSON)으로 secret에 둔다. 공개 키(base64url)는 앱의 NEXT_PUBLIC_VAPID_PUBLIC_KEY와 같은 키 쌍이어야 한다
  const vapidKeys = await webpush.importVapidKeys(JSON.parse(vapidJson));
  const appServer = await webpush.ApplicationServer.new({
    // 푸시 서비스 관리자가 문제가 있을 때 연락할 주소 (mailto: 또는 https:)
    contactInformation: contact,
    vapidKeys,
  });

  let sent = 0;
  const gone = new Set<string>();
  for (const reminder of reminders) {
    const payload = JSON.stringify(buildReminderPayload(reminder));
    const targets = subscriptions.filter(
      (row) => row.user_id === reminder.user_id,
    );
    for (const row of targets) {
      try {
        await appServer
          .subscribe({
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          })
          .pushTextMessage(payload, { ttl: TTL_SECONDS });
        sent += 1;
      } catch (error) {
        if (
          error instanceof webpush.PushMessageError &&
          isGoneStatus(error.response.status)
        ) {
          gone.add(row.id);
        } else {
          // 다른 실패(일시 장애)는 구독을 남긴다. 알림 내용·주소는 기록하지 않는다 (개인 루틴 이름)
          console.error('[reminders] 보내기 실패', String(error));
        }
      }
    }
  }

  if (gone.size > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('id', [...gone]);
  }
  return json({ due: reminders.length, sent, removed: gone.size });
});
