-- 35a 루틴 푸시 알림: 알림 시각(루틴마다)과 푸시 구독(기기마다). 보내기(pg_cron + Edge Function)는 35b.

-- ── 루틴 알림 시각 ─────────────────────────────────────
-- 한국 시각 'HH:MM' (시간대 없는 time). null = 알림 없음.
-- 10분 단위만 받는다 (2026-10-23 사용자 결정): 보내는 작업이 10분마다 돌아서, 그 사이 시각은 언제 울릴지 애매해진다.
-- 앱(Zod)도 같은 규칙으로 막고, DB는 앱을 거치지 않는 요청까지 막는 마지막 방어선
alter table public.routines
add column remind_at time check (
  remind_at is null
  or (
    extract(second from remind_at) = 0
    and extract(minute from remind_at)::integer % 10 = 0
  )
);

-- ── 푸시 구독 (기기 단위, CLAUDE.md) ──────────────────────
-- 브라우저가 pushManager.subscribe()로 받은 값 그대로: 보낼 주소(endpoint)와 암호화 키 두 개.
-- 한 사람이 휴대폰·PC 두 기기에서 켜면 두 줄이고, 보낼 때는 그 사람의 모든 줄로 보낸다 (35b).
-- 주소가 더 이상 없다고(410) 답하는 구독은 보내는 쪽이 지운다 (35b)
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- 같은 기기(브라우저)는 주소가 하나다. 다른 계정으로 다시 로그인한 기기는 그 계정으로 옮긴다 (아래 함수)
  endpoint text not null unique check (
    char_length(endpoint) <= 1000
    and endpoint like 'https://%'
  ),
  p256dh text not null check (char_length(p256dh) between 1 and 200),
  auth text not null check (char_length(auth) between 1 and 100),
  created_at timestamptz not null default now()
);

-- 보낼 때 "이 사람의 모든 기기"로 찾는다
create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- 넣기는 아래 함수로만 (같은 주소의 다른 계정 줄을 지워야 해서 RLS를 넘는다). 사용자는 자기 줄을 읽고 지우기만
grant select, delete on public.push_subscriptions to authenticated;

create policy "본인 푸시 구독 조회"
on public.push_subscriptions for select
to authenticated
using ((select auth.uid()) = user_id);

-- 이 기기 알림 끄기·로그아웃 때 지운다
create policy "본인 푸시 구독 삭제"
on public.push_subscriptions for delete
to authenticated
using ((select auth.uid()) = user_id);

-- 이 기기의 구독을 지금 계정 것으로 저장한다.
-- 같은 주소가 다른 계정에 남아 있으면(공용 기기에서 로그아웃 정리가 실패한 경우 등) 지우고 옮긴다:
-- 남겨 두면 지금 사용자 기기에 다른 사람의 루틴 알림이 뜬다.
-- security definer: 다른 계정의 줄을 지우려면 RLS를 넘어야 한다. 그래서 누구로 저장할지는 인자가 아니라 auth.uid()로만 정한다
create or replace function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth);
end;
$$;

revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
