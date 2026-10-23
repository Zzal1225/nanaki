-- AI 나키 하루 사용 횟수 (step3). 무료 등급 AI라 하루 횟수를 제한한다 (2026-10-23 사용자 결정):
-- 로그인 계정 10회 · 체험(익명) 계정 3회 · 서비스 전체 200회. 숫자는 서버 환경 변수(NAKI_DAILY_LIMIT_*)라 이 파일에 없다.
-- 한 표에 개인과 전체를 함께 센다: key = 사용자 id(글자) 또는 'global'.
-- 하루 = 한국 날짜. 서버(Route Handler)가 계산해 넘긴다 (날짜 경계를 앱에서 테스트하려고, features/naki/nakiLimits)
-- 세기·되돌리기·조회는 모두 서버가 관리자 키로만 한다:
--   한도 숫자를 인자로 받는 함수를 사용자에게 열면, 사용자가 직접 불러 큰 한도를 넘기거나 전체 횟수를 소진시킬 수 있다

create table public.ai_usage (
  -- 사용자 id 또는 'global'. 사용자 표와 잇지 않는다(전체 줄이 있어서): 계정을 지워도 그날 줄만 남고 다음 날부터 안 쓰인다
  key text not null check (key = 'global' or key ~ '^[0-9a-f-]{36}$'),
  day date not null,
  count integer not null default 0 check (count >= 0),
  primary key (key, day)
);

-- RLS를 켜고 정책을 두지 않는다: 사용자 요청(anon·authenticated)으로는 읽을 수도 쓸 수도 없다. 관리자 키(service_role)는 RLS를 넘는다
alter table public.ai_usage enable row level security;

-- 한 번 쓰기: 개인 한도 → 전체 한도 순서로 1씩 늘린다. 결과:
--   'ok:<남은 개인 횟수>' / 'user_limit' / 'global_limit'
-- 한 함수 = 한 트랜잭션: 전체 한도에 걸리면 방금 늘린 개인 횟수를 되돌려, 쓰지 못한 질문이 개인 횟수를 먹지 않게.
-- "읽고 → 비교 → 쓰기"를 나누면 동시 요청이 같은 값을 읽어 한도를 넘긴다 → insert … on conflict … where 한 문장으로.
-- 같은 줄에 동시에 오면 뒤의 것이 줄 잠금을 기다린 뒤 where를 다시 본다 (read committed)
create or replace function public.use_ai_quota(
  p_user_key text,
  p_day date,
  p_user_limit integer,
  p_global_limit integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_used integer;
  global_used integer;
begin
  insert into public.ai_usage as usage (key, day, count)
  values (p_user_key, p_day, 1)
  on conflict (key, day) do update
    set count = usage.count + 1
    where usage.count < p_user_limit
  returning usage.count into user_used;

  -- 한도에 닿아 update가 건너뛰어지면 returning이 비어 null이다
  if user_used is null then
    return 'user_limit';
  end if;

  insert into public.ai_usage as usage (key, day, count)
  values ('global', p_day, 1)
  on conflict (key, day) do update
    set count = usage.count + 1
    where usage.count < p_global_limit
  returning usage.count into global_used;

  if global_used is null then
    update public.ai_usage
    set count = count - 1
    where key = p_user_key and day = p_day;
    return 'global_limit';
  end if;

  return 'ok:' || (p_user_limit - user_used);
end;
$$;

-- 한 번 되돌리기 (AI 제공자 쪽 실패: 사용자 탓이 아니다). 개인·전체 모두 1 내린다. 0 아래로는 내려가지 않는다
create or replace function public.refund_ai_quota(p_user_key text, p_day date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ai_usage
  set count = greatest(count - 1, 0)
  where day = p_day
    and key in (p_user_key, 'global');
end;
$$;

-- 그날 개인이 쓴 횟수 (화면 "오늘 N/10회"). 줄이 없으면 0
create or replace function public.get_ai_usage(p_user_key text, p_day date)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select count from public.ai_usage where key = p_user_key and day = p_day
  ), 0);
$$;

-- 관리자 키(service_role)만. 사용자 키로는 셋 다 부를 수 없다 (위 설명)
revoke execute on function public.use_ai_quota(text, date, integer, integer) from public, anon, authenticated;
revoke execute on function public.refund_ai_quota(text, date) from public, anon, authenticated;
revoke execute on function public.get_ai_usage(text, date) from public, anon, authenticated;
grant execute on function public.use_ai_quota(text, date, integer, integer) to service_role;
grant execute on function public.refund_ai_quota(text, date) to service_role;
grant execute on function public.get_ai_usage(text, date) to service_role;
