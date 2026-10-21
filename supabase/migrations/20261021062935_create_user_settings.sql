-- 사용자마다 한 줄인 설정. 폰·PC 어디서 로그인해도 같은 설정이 보이도록 기기(브라우저)가 아니라 DB에 둔다.
-- 계정을 지우면(auth.users 줄 삭제) 설정도 함께 지워진다 (on delete cascade)

create table public.user_settings (
  -- 한 사람에 한 줄이라 user_id가 곧 기본 키. 기본값이 지금 로그인한 사람이라 앱은 보내지 않아도 된다
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- "켠 타입"이 아니라 "숨긴 타입"을 담는다. step2에서 운동·루틴·체형이 생기면 아무것도 안 해도 켜진 채로 나타난다
  -- (켠 목록으로 저장하면 새 타입이 기존 사용자에게는 꺼진 채로 숨어 버린다).
  -- 모르는 타입 이름은 DB가 막는다 (records.type과 같은 다섯 개)
  hidden_types text[] not null default '{}'
    check (hidden_types <@ array['expense', 'review', 'workout', 'routine', 'body']),
  updated_at timestamptz not null default now()
);

-- records와 같은 트리거 함수를 다시 쓴다: 고칠 때마다 updated_at을 서버 시각으로
create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

grant select, insert, update on public.user_settings to authenticated;

-- 삭제 정책은 두지 않는다: 설정 줄은 계정을 지울 때 cascade로만 사라진다
create policy "본인 설정 조회"
on public.user_settings for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "본인 설정 추가"
on public.user_settings for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "본인 설정 수정"
on public.user_settings for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
