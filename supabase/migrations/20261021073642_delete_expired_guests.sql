-- "로그인 없이 체험하기"로 만든 익명 계정을 만든 지 3일이 지나면 지운다.
-- 로그인 화면이 "체험 기록은 3일 뒤 삭제돼요"라고 약속하고, 로그아웃한 체험 계정은 주인이 다시 들어올 수 없어 계속 쌓이기 때문이다.
-- 3일은 앱의 GUEST_RETENTION_DAYS(src/features/auth/guestRetention.ts)와 같은 값이어야 한다

-- 예약 작업 기능. Supabase는 pg_catalog 스키마에 두는 방식을 쓴다
create extension if not exists pg_cron with schema pg_catalog;

-- 지운 계정 수를 돌려준다 (예약 작업 기록에서 확인하거나 SQL 편집기에서 직접 불러 볼 때).
-- auth.users 줄을 지우면 records·user_settings는 on delete cascade로 함께 지워진다.
-- 기준은 마지막 접속이 아니라 만든 시각 (사용자 결정): 안내 문구 "3일 뒤 삭제"와 그대로 맞고 예측하기 쉽다.
-- security definer: auth 스키마를 지울 권한은 이 함수를 만든 postgres에게만 있다.
-- search_path = '': 이름을 모두 스키마까지 적어, 누군가 같은 이름의 표를 다른 스키마에 만들어 끼어드는 것을 막는다
create or replace function public.delete_expired_guests()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  delete from auth.users
  where is_anonymous
    and created_at < now() - interval '3 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- public 스키마의 함수는 앱의 API(rpc)로도 부를 수 있다. 사용자는 이 함수를 부를 이유가 없으므로 실행 권한을 거둔다
-- (Supabase는 새 함수에 anon·authenticated 실행 권한을 기본으로 준다)
revoke execute on function public.delete_expired_guests() from public, anon, authenticated;

-- 매시간 정각. 하루 한 번이면 최대 4일 가까이 남을 수 있어서 시간 단위로 돌린다.
-- 같은 이름으로 다시 부르면 새로 만들지 않고 바꾼다 (이 파일을 다시 적용해도 작업이 두 개가 되지 않는다)
select cron.schedule(
  'delete-expired-guests',
  '0 * * * *',
  $$select public.delete_expired_guests()$$
);
