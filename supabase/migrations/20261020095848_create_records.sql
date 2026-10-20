-- 다섯 타입(가계부·후기·운동·루틴·체형)의 기록을 담는 공통 테이블.
-- 공통 칸은 열로, 타입마다 다른 값은 fields(jsonb) 하나에 담는다. fields의 모양은 앱의 필드 스키마(Zod)가 검사한다.

create table public.records (
  -- 오프라인에서도 브라우저가 먼저 번호를 만들 수 있게 숫자 대신 UUID
  id uuid primary key default gen_random_uuid(),
  -- 기본값이 지금 로그인한 사람이라, 앱은 user_id를 따로 보내지 않아도 된다
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- 앱에서 타입을 잘못 보내도 DB가 막는다
  type text not null check (type in ('expense', 'review', 'workout', 'routine', 'body')),
  -- 시간대 없는 날짜. 한국 자정 무렵 기록이 UTC 변환으로 전날로 밀리는 문제를 피한다
  occurred_at date not null,
  title text not null,
  -- 시안의 메모 글자 수 제한. 메모가 없으면(null) 검사는 통과한다
  memo text check (char_length(memo) <= 500),
  tags text[] not null default '{}',
  fields jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 소프트 삭제: 값이 있으면 지운 기록. 기록을 읽는 모든 곳에서 deleted_at is null을 붙여야 한다
  deleted_at timestamptz
);

-- 캘린더와 목록은 "내 기록 중 이 기간"으로 찾으므로 그 순서대로 색인을 건다
create index records_user_id_occurred_at_idx on public.records (user_id, occurred_at);

-- 고칠 때마다 updated_at을 지금 시각으로 바꾼다. 앱이 빠뜨려도 DB가 보장한다 (동기화 충돌의 기준)
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger records_set_updated_at
before update on public.records
for each row execute function public.set_updated_at();

-- RLS(행 단위 권한): 정책에 맞는 줄만 읽고 쓸 수 있다. 켜기만 하고 정책이 없으면 아무도 못 본다.
-- 앱 코드에 실수가 있어도 남의 기록은 DB가 막는다
alter table public.records enable row level security;

-- 로그인한 사람(익명 체험 포함)만 이 테이블을 쓸 수 있게 권한을 준다. 어떤 줄인지는 아래 정책이 정한다
grant select, insert, update, delete on public.records to authenticated;

-- 네 정책의 조건은 모두 "지금 로그인한 사람 = 이 줄의 주인"이다.
-- (select auth.uid())처럼 괄호로 감싸면 줄마다 다시 계산하지 않아 빠르다.
-- using = 이미 있는 줄 중 어떤 줄을 건드릴 수 있나, with check = 새로 쓰거나 고친 뒤의 줄이 맞나
create policy "본인 기록 조회"
on public.records for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "본인 기록 추가"
on public.records for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- with check가 없으면 내 기록을 고치면서 user_id를 남의 것으로 바꿔 넘길 수 있다
create policy "본인 기록 수정"
on public.records for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "본인 기록 삭제"
on public.records for delete
to authenticated
using ((select auth.uid()) = user_id);
