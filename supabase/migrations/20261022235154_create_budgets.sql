-- 가계부 예산 (step3). 한 사람 · 한 달에 한 줄: "2026-10 전체 600,000원, 식비 300,000원, 카페 50,000원".
-- 달마다 따로 둔다 (2026-10-23 사용자 결정): 예산을 바꿔도 지난달 화면은 그달 예산 그대로 보인다.
-- 새 달에 줄이 없으면 앱이 가장 최근 달의 예산을 이어받아 보여 주고, 고쳐 저장할 때 그 달 줄을 만든다
-- (매달 줄을 미리 만들지 않는다: 예산을 쓰지 않는 사람에게 빈 줄이 쌓이지 않게)
-- 계정을 지우면 예산도 함께 지워진다 (on delete cascade)

create table public.budgets (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- 'YYYY-MM'. date(그달 1일)가 아니라 글자인 이유: 앱의 달 값(?month=, shared/date/month)과 같은 모양이고,
  -- 글자 순서 = 달 순서라 "이 달 이전 중 가장 최근"을 order by month desc로 바로 찾는다
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  -- 그달 전체 예산. null = 전체 예산 없음(분류별만 쓰는 사람). 상한은 앱의 지출 금액 상한과 같다
  total_amount integer check (total_amount is null or total_amount between 1 and 99999999),
  -- 분류별 예산: {"식비": 300000, "카페": 50000}. 키는 분류 이름(직접 입력한 분류도 된다).
  -- 값·키의 자세한 규칙은 앱의 Zod 스키마(features/budget/schema)가 검사하고, DB는 객체인지만 본다 (records.fields와 같은 분담)
  category_amounts jsonb not null default '{}'::jsonb check (jsonb_typeof(category_amounts) = 'object'),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default now(),
  -- 한 사람 · 한 달에 한 줄. 이 키로 upsert(있으면 고치고 없으면 만들기)하고, "이 달 이전 중 최근"도 이 색인으로 찾는다
  primary key (user_id, month)
);

-- records·routines와 같은 트리거 함수: 고칠 때마다 updated_at을 서버 시각으로
create trigger budgets_set_updated_at
before update on public.budgets
for each row execute function public.set_updated_at();

alter table public.budgets enable row level security;

-- 앱은 지우지 않는다(예산을 비우려면 전체·분류를 비워 저장). 줄은 계정을 지울 때 cascade로만 사라진다.
-- 삭제를 막는 것은 "삭제 정책이 없는 것"이다 (routines와 같은 이유: grant만으로는 막히지 않는다)
grant select, insert, update on public.budgets to authenticated;

create policy "본인 예산 조회"
on public.budgets for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "본인 예산 추가"
on public.budgets for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- with check가 없으면 내 예산을 고치면서 user_id를 남의 것으로 바꿔 넘길 수 있다
create policy "본인 예산 수정"
on public.budgets for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
