-- AI 나키 하루 사용 횟수 (step3). 무료 등급 AI라 계정마다 하루 횟수를 제한한다 (README: 기본 20회, 체험 계정 10회, 시안 "오늘 N/20회").
-- 세는 일은 서버(Route Handler)가 아래 함수로만 한다. 브라우저가 세면 고쳐서 보낼 수 있다.
-- 하루 = 한국 시간 날짜 (앱의 날짜와 같은 기준, 고정지출 함수와 같은 이유)
-- 계정을 지우면 함께 지워진다 (on delete cascade)

create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

-- 사용자는 자기 줄을 읽기만 한다 ("오늘 N/20회" 표시). 쓰기는 아래 함수(security definer)로만:
-- insert·update 정책이 없으면 사용자 요청으로 고칠 수 있는 줄이 0줄이다
grant select on public.ai_usage to authenticated;

create policy "본인 AI 사용량 조회"
on public.ai_usage for select
to authenticated
using ((select auth.uid()) = user_id);

-- 이 계정의 하루 한도. 체험(익명) 계정은 더 적게: 로그인 없이 누구나 만들 수 있어 무료 등급을 빨리 다 쓸 수 있다
create or replace function public.ai_daily_limit()
returns integer
language sql
stable
set search_path = ''
as $$
  select case when coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then 10 else 20 end;
$$;

-- 한 번 쓰기. 한도 안이면 1 늘리고 남은 횟수를, 한도면 늘리지 않고 -1을 돌려준다.
-- "읽고 → 비교 → 쓰기"를 나누면 동시에 두 요청이 같은 값을 읽어 한도를 넘길 수 있어서, 한 문장(insert … on conflict … where)으로 한다:
-- 같은 줄에 동시에 오면 뒤의 것이 줄 잠금을 기다린 뒤 where를 다시 본다
-- security definer: 사용자에게 쓰기 권한을 주지 않고 이 함수로만 늘리게. 누구의 줄인지는 인자가 아니라 auth.uid()로만 정한다
create or replace function public.use_ai_quota()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Asia/Seoul')::date;
  day_limit integer := public.ai_daily_limit();
  used integer;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  insert into public.ai_usage as usage (user_id, day, count)
  values (uid, today, 1)
  on conflict (user_id, day) do update
    set count = usage.count + 1
    where usage.count < day_limit
  returning usage.count into used;

  -- 한도에 닿아 update가 건너뛰어지면 returning이 비어 used가 null이다
  if used is null then
    return -1;
  end if;
  return day_limit - used;
end;
$$;

-- 한 번 되돌리기. AI 제공자 쪽 실패(시간 초과·한도·장애)는 사용자 탓이 아니라 횟수에서 빼 준다. 0 아래로는 내려가지 않는다.
-- 사용자 권한으로는 부를 수 없다(아래 grant): 열어 두면 사용자가 직접 불러 횟수를 계속 되돌려 한도를 우회한다.
-- 서버(Route Handler)가 관리자 키로, 세션에서 확인한 사용자 id를 넘겨 부른다
create or replace function public.refund_ai_quota(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $
begin
  update public.ai_usage
  set count = greatest(count - 1, 0)
  where user_id = p_user_id
    and day = (now() at time zone 'Asia/Seoul')::date;
end;
$;

-- 오늘 남은 횟수와 한도 (화면 "오늘 N/20회"). 줄이 없으면 한도 그대로
create or replace function public.get_ai_quota()
returns table (remaining integer, day_limit integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.ai_daily_limit() - coalesce((
      select count from public.ai_usage
      where user_id = auth.uid()
        and day = (now() at time zone 'Asia/Seoul')::date
    ), 0),
    public.ai_daily_limit();
$$;

-- 로그인 사용자만 (Route Handler가 사용자 세션으로 부른다). 익명(anon 역할, 로그인 안 함)은 못 부른다
revoke execute on function public.use_ai_quota() from public, anon;
revoke execute on function public.refund_ai_quota(uuid) from public, anon, authenticated;
revoke execute on function public.get_ai_quota() from public, anon;
grant execute on function public.use_ai_quota() to authenticated;
grant execute on function public.refund_ai_quota(uuid) to service_role;
grant execute on function public.get_ai_quota() to authenticated;
