-- 35b 루틴 푸시 보내기: 지금 알릴 루틴 고르기(DB 함수) + 10분마다 Edge Function 부르기(pg_cron + pg_net).
-- 실제 발송(암호화·VAPID 서명)은 Edge Function send-routine-reminders가 한다 (@negrel/webpush, 2026-10-23 사용자 승인)

-- ── 보낸 표시 ──────────────────────────────────────────
-- (루틴, 한국 날짜)마다 한 줄: 작업이 겹쳐 돌거나 다시 돌아도 하루 한 번만 보낸다 (기본 키로 막는다).
-- routines 표에 "마지막으로 보낸 날" 칸을 두지 않는 이유: 그 줄을 고치면 updated_at이 바뀌어
-- 모든 기기가 매일 루틴을 다시 받아 간다 (동기화 커서, 25b)
create table public.routine_reminders_sent (
  routine_id uuid not null references public.routines (id) on delete cascade,
  day date not null,
  sent_at timestamptz not null default now(),
  primary key (routine_id, day)
);

-- 사용자가 볼 일이 없는 서버 내부 표: RLS를 켜고 정책을 두지 않는다 (관리자 키로 도는 함수만 쓴다)
alter table public.routine_reminders_sent enable row level security;
revoke all on public.routine_reminders_sent from anon, authenticated;

-- ── 지금 알릴 루틴 고르기 ─────────────────────────────────
-- 조건 (2026-10-23 사용자 결정 포함):
-- - 알림 시각이 있고, 한국 시각으로 (알림 시각 ≤ 지금 < 알림 시각 + 30분): 10분마다 도는데 한두 번 빠져도 따라잡는다.
--   30분이 지나면 보내지 않는다 (오후에 만든 루틴의 오전 알림이 뒤늦게 울리지 않게)
-- - 오늘 할 루틴: 시작일 이후, 그만둔 날 전, 반복 규칙에 오늘이 든다 (앱 shared/schedule과 같은 규칙: 매달 31일은 짧은 달의 말일)
-- - 아직 안 했다: 오늘 체크 기록이 없거나 목표를 못 채웠다 (기록에 남긴 그날 목표로 본다, 앱 isCheckDone과 같다)
-- - 오늘 아직 안 보냈다: 보낸 표시를 넣으면서(on conflict do nothing) 새로 넣은 것만 돌려준다 → 겹쳐 돌아도 한 번
-- 날짜·시각 계산은 timestamp(시간대 없음)로: time끼리 빼면 자정에서 23시로 돌아가 00:00 알림이 00:05에 빠진다
-- p_now는 테스트가 시각을 정해 부를 수 있게 둔다
create or replace function public.claim_due_routine_reminders(
  p_now timestamptz default now()
)
returns table (
  routine_id uuid,
  user_id uuid,
  routine_name text,
  goal jsonb,
  done_count integer,
  day date
)
language sql
security definer
set search_path = ''
as $$
  with clock as (
    select
      (p_now at time zone 'Asia/Seoul') as local_now,
      (p_now at time zone 'Asia/Seoul')::date as today
  ),
  month_info as (
    select
      clock.*,
      extract(day from (date_trunc('month', clock.today::timestamp) + interval '1 month - 1 day'))::integer as month_last_day
    from clock
  ),
  candidates as (
    select
      r.id,
      r.user_id,
      r.name,
      r.goal,
      m.today,
      -- 오늘 체크 기록 (루틴 × 하루는 한 줄, records_routine_check_unique)
      (
        select rec.fields
        from public.records rec
        where rec.user_id = r.user_id
          and rec.type = 'routine'
          and rec.deleted_at is null
          and rec.occurred_at = m.today
          and rec.fields ->> 'routineId' = r.id::text
        limit 1
      ) as check_fields
    from public.routines r
    cross join month_info m
    where r.remind_at is not null
      and (m.today + r.remind_at) <= m.local_now
      and (m.today + r.remind_at) > m.local_now - interval '30 minutes'
      and r.start_date <= m.today
      and (r.ended_on is null or m.today < r.ended_on)
      and case r.schedule ->> 'kind'
        when 'weekly' then (r.schedule -> 'days') @> to_jsonb(extract(dow from m.today)::integer)
        when 'monthly' then extract(day from m.today)::integer = least((r.schedule ->> 'day')::integer, m.month_last_day)
        else false
      end
  ),
  pending as (
    select
      c.*,
      coalesce((c.check_fields ->> 'count')::integer, 0) as count_done
    from candidates c
    where c.check_fields is null
      or (c.check_fields ->> 'count')::integer < (c.check_fields ->> 'target')::integer
  ),
  claimed as (
    insert into public.routine_reminders_sent (routine_id, day)
    select p.id, p.today from pending p
    on conflict do nothing
    returning routine_reminders_sent.routine_id
  )
  select p.id, p.user_id, p.name, p.goal, p.count_done, p.today
  from pending p
  join claimed c on c.routine_id = p.id;
$$;

-- 관리자 키(Edge Function)만 부른다: 모든 사용자의 루틴을 읽는 함수다
revoke execute on function public.claim_due_routine_reminders(timestamptz) from public, anon, authenticated;
grant execute on function public.claim_due_routine_reminders(timestamptz) to service_role;

-- 보낸 표시는 오늘 것만 쓰므로 일주일 지난 줄은 지운다 (매일 한국 새벽 3시 10분)
select cron.schedule(
  'delete-old-routine-reminders-sent',
  '10 18 * * *',
  $$delete from public.routine_reminders_sent where day < (now() at time zone 'Asia/Seoul')::date - 7$$
);

-- ── 10분마다 Edge Function 부르기 ─────────────────────────
-- pg_net: DB 안에서 HTTP 요청을 보내는 Supabase 확장 (비동기, 응답을 기다리지 않는다)
create extension if not exists pg_net with schema extensions;

-- 주소와 비밀 값은 마이그레이션에 쓰지 않고 Vault(암호화 저장소)에서 읽는다 (저장소에 키가 남지 않게).
-- 사용자가 Supabase에서 한 번 넣는다: vault.create_secret(주소, 'project_url'), vault.create_secret(비밀, 'reminder_cron_secret').
-- 값이 없으면(로컬·CI) 아무것도 보내지 않는다 (where exists)
select cron.schedule(
  'send-routine-reminders',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/send-routine-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reminder-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminder_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'project_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'reminder_cron_secret')
  $$
);
