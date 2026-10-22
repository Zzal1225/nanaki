-- 루틴(반복 규칙). CLAUDE.md 원칙: 기록(records)은 "일어난 일"만 담고, "언제 반복되는가"는 따로 둔다.
-- 여기에는 "매주 월·수·금 물 8잔" 같은 규칙만 있고, "10월 21일 물 5/8잔" 같은 수행 결과는 records(type = 'routine')에 남긴다.
-- 계정을 지우면 루틴도 함께 지워진다 (on delete cascade)

create table public.routines (
  -- 오프라인에서도 브라우저가 먼저 번호를 만들 수 있게 UUID (records와 같은 이유)
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- 앱(Zod)의 이름 상한과 같은 값. DB는 앱을 거치지 않는 요청까지 막는 마지막 방어선
  name text not null check (char_length(name) between 1 and 40),
  -- 시간대 없는 날짜 (records.occurred_at과 같은 이유: UTC 변환으로 하루 밀리지 않게)
  start_date date not null,
  -- 반복 규칙: {"kind":"weekly","days":[1,3,5]} 또는 {"kind":"monthly","day":31}.
  -- 고정지출(step3)도 같은 모양을 쓴다. 자세한 모양은 앱의 Zod 스키마(src/shared/schedule)가 검사하고,
  -- DB는 종류만 확인한다 (records.fields와 같은 분담)
  schedule jsonb not null check (schedule ->> 'kind' in ('weekly', 'monthly')),
  -- 목표: {"kind":"check"} (한 번 체크하면 완료) 또는 {"kind":"count","target":8,"unit":"잔"} (하루 8잔 채우면 완료)
  goal jsonb not null check (goal ->> 'kind' in ('check', 'count')),
  -- 그만둔 날. 이 날부터 일정이 없다(이 날은 포함하지 않음). null = 진행 중.
  -- 지우지 않고 그만두게 하는 이유: 지난 체크 기록과 달성률이 이 규칙을 기준으로 계산되기 때문
  ended_on date check (ended_on is null or ended_on >= start_date),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default now()
);

-- 루틴 목록은 늘 "내 루틴 전부"로 읽어서 사용자 기준 색인 하나면 된다
create index routines_user_id_idx on public.routines (user_id);

-- records와 같은 트리거 함수: 고칠 때마다 updated_at을 서버 시각으로 (동기화 충돌의 기준)
create trigger routines_set_updated_at
before update on public.routines
for each row execute function public.set_updated_at();

alter table public.routines enable row level security;

-- 삭제 권한은 주지 않는다: 앱은 그만두기(ended_on)만 쓰고, 줄은 계정을 지울 때 cascade로만 사라진다
grant select, insert, update on public.routines to authenticated;

-- 조건은 records와 같다: 지금 로그인한 사람 = 이 줄의 주인
create policy "본인 루틴 조회"
on public.routines for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "본인 루틴 추가"
on public.routines for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- with check가 없으면 내 루틴을 고치면서 user_id를 남의 것으로 바꿔 넘길 수 있다
create policy "본인 루틴 수정"
on public.routines for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
