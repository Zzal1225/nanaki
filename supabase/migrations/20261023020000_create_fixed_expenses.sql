-- 고정지출 (step3). "매달 5일 통신비 55,000원" 같은 반복 규칙.
-- CLAUDE.md 원칙: 기록(records)은 "일어난 일"만 담고, 반복 규칙은 따로 둔다. 그날이 되면 서버가 이 규칙으로
-- 가계부 기록을 하나 만든다 (아래 record_due_fixed_expenses, pg_cron). 만든 기록은 사용자 기록과 똑같이 고치고 지울 수 있다.
-- 해지하면 줄을 지운다 (2026-10-23 사용자 결정). 이미 만든 기록은 복사본이라 규칙이 없어져도 남는다 (루틴과 다른 점:
-- 루틴은 지난 달성률이 규칙을 기준으로 계산돼서 지우지 않고 그만두게 했다)
-- 계정을 지우면 고정지출도 함께 지워진다 (on delete cascade)

create table public.fixed_expenses (
  -- 루틴·기록과 같이 UUID
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- 만들어질 가계부 기록의 제목이 된다. records 제목 상한(40)과 같은 값
  name text not null check (char_length(name) between 1 and 40),
  -- 지출 금액 규칙과 같다 (앱의 MAX_EXPENSE_AMOUNT)
  amount integer not null check (amount between 1 and 99999999),
  -- 분류·결제수단은 가계부 기록의 칸과 같은 규칙 (직접 입력 가능, 12자까지)
  category text not null check (char_length(category) between 1 and 12),
  payment_method text check (payment_method is null or char_length(payment_method) between 1 and 12),
  -- 공통 반복 규칙 Schedule(src/shared/schedule)과 같은 모양: {"kind":"monthly","day":5}.
  -- 고정지출은 지금은 "매달 n일"만 쓴다 (시안 18). 날짜는 1~31: 그 날이 없는 달은 말일 (Schedule과 같은 규칙).
  -- 정규식으로 보는 이유: (schedule->>'day')::int는 숫자가 아니면 check가 false가 아니라 오류로 끝나고, and의 계산 순서도 보장되지 않는다
  schedule jsonb not null check (
    schedule ->> 'kind' = 'monthly'
    and schedule ->> 'day' ~ '^([1-9]|[12][0-9]|3[01])$'
  ),
  -- 이 날부터 기록한다 (보통 추가한 날). 추가한 달의 결제일이 이미 지났으면 다음 결제일부터 (2026-10-23 사용자 결정)
  start_date date not null,
  -- 마지막으로 가계부 기록을 만든 결제일. 같은 결제일에 두 번 만들지 않는 표시이고, 목록의 "기록됨"도 이걸로 안다.
  -- 사용자가 만든 기록을 지워도 다시 만들지 않는다 (지운 것은 지운 것)
  last_recorded_on date,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default now()
);

-- 목록은 늘 "내 고정지출 전부"로 읽는다
create index fixed_expenses_user_id_idx on public.fixed_expenses (user_id);

create trigger fixed_expenses_set_updated_at
before update on public.fixed_expenses
for each row execute function public.set_updated_at();

alter table public.fixed_expenses enable row level security;

-- 해지 = 삭제라서 이 표는 삭제 정책도 둔다 (routines·budgets와 다름)
grant select, insert, update, delete on public.fixed_expenses to authenticated;

create policy "본인 고정지출 조회"
on public.fixed_expenses for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "본인 고정지출 추가"
on public.fixed_expenses for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- with check가 없으면 내 줄을 고치면서 user_id를 남의 것으로 바꿔 넘길 수 있다
create policy "본인 고정지출 수정"
on public.fixed_expenses for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "본인 고정지출 삭제"
on public.fixed_expenses for delete
to authenticated
using ((select auth.uid()) = user_id);

-- 오늘(한국 시간)까지 이번 달 결제일이 된 고정지출을 가계부 기록으로 만든다. 만든 기록 수를 돌려준다.
-- - 날짜는 한국 시간: 앱의 날짜(occurred_at)가 사용자의 로컬 날짜이고, 앱은 한국어·원화 고정이다 (CLAUDE.md).
--   pg_cron은 UTC로 돌아서 now()::date를 쓰면 한국 오전 9시 전에는 어제가 된다
-- - "오늘이 결제일"이 아니라 "이번 달 결제일이 지났는데 아직 안 만듦": 서버가 그 시각에 멈춰 있었어도 이번 달 안에는 따라잡는다
-- - 31일 규칙은 30일까지 있는 달에 30일 (Schedule의 isScheduledOn과 같은 규칙)
-- - 시작일 전의 결제일은 만들지 않는다 (추가한 달의 지난 결제일)
-- - 한 달에 한 번: 이번 달에 이미 만들었으면 결제일을 바꿔도 다시 만들지 않는다
-- - 두 번 돌아도 한 번만: last_recorded_on을 먼저 고치고(조건을 다시 확인하며) 고친 줄만 기록으로 만든다.
--   동시에 두 번 돌면 뒤의 것은 줄 잠금을 기다린 뒤 조건을 다시 보고 건너뛴다 (Postgres read committed의 update 재확인)
-- p_today는 테스트가 날짜를 정해 부를 수 있게 둔다 (기본값 = 한국의 오늘)
-- security definer: 모든 사용자의 줄을 읽고 기록을 넣어야 한다 (RLS를 넘는다). 그래서 사용자 실행 권한은 거둔다
create or replace function public.record_due_fixed_expenses(
  p_today date default (now() at time zone 'Asia/Seoul')::date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- ::timestamp: date를 그대로 넣으면 시간대가 붙은 값(timestamptz)으로 바뀌어 세션 시간대에 따라 달이 밀릴 수 있다
  month_start date := date_trunc('month', p_today::timestamp)::date;
  month_last_day integer := extract(day from (date_trunc('month', p_today::timestamp) + interval '1 month - 1 day'))::integer;
  inserted_count integer;
begin
  with due as (
    select
      f.id,
      (month_start + (least((f.schedule ->> 'day')::integer, month_last_day) - 1))::date as due_on
    from public.fixed_expenses f
  ),
  marked as (
    update public.fixed_expenses f
    set last_recorded_on = due.due_on
    from due
    where f.id = due.id
      and due.due_on <= p_today
      and due.due_on >= f.start_date
      -- 이번 달에 아직 안 만들었을 때만 (한 달에 한 번). "< 결제일"로 보면 결제일을 5일 → 20일로 바꿨을 때 같은 달에 두 번 만든다
      and (f.last_recorded_on is null or f.last_recorded_on < month_start)
    returning f.user_id, f.name, f.amount, f.category, f.payment_method, due.due_on
  )
  insert into public.records (user_id, type, occurred_at, title, tags, fields)
  select
    marked.user_id,
    'expense',
    marked.due_on,
    marked.name,
    -- 자동으로 만든 기록 표시 (2026-10-23 사용자 결정). 검색·태그 표시가 그대로 되고, 사용자가 지울 수도 있다
    array['고정지출'],
    -- 앱의 가계부 fields 모양 그대로. 결제수단이 없으면 칸을 빼서(null을 넣지 않고) 앱 스키마의 optional과 맞춘다
    jsonb_strip_nulls(jsonb_build_object(
      'amount', marked.amount,
      'category', marked.category,
      'paymentMethod', marked.payment_method
    ))
  from marked;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

-- delete_expired_guests와 같은 이유: 사용자가 rpc로 부를 이유가 없다 (남의 고정지출까지 처리하는 함수다)
revoke execute on function public.record_due_fixed_expenses(date) from public, anon, authenticated;

-- 매시간 5분. 한국 자정을 넘긴 뒤 1시간 안에 그날 기록이 생긴다.
-- 하루 한 번이 아니라 매시간인 이유: 한 번 실패해도 다음 시간에 따라잡고, 결제일에 추가한 고정지출도 그날 안에 기록된다
select cron.schedule(
  'record-due-fixed-expenses',
  '5 * * * *',
  $$select public.record_due_fixed_expenses()$$
);
