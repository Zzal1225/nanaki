-- step4 37b 주인 없는 사진 파일 정리: 사진 표(photos)에 줄이 없는 버킷 파일을 하루 한 번 지운다.
-- 이런 파일이 생기는 곳:
-- - 체험 계정 만료(delete_expired_guests): SQL로 사용자를 지우면 사진 줄은 cascade로 사라지지만, Storage 파일은 DB에서 지울 수 없다
-- - 사진 지우기에서 줄은 지웠는데 파일 삭제가 실패 (photoStore.deletePhoto)
-- - 파일을 올린 뒤 줄을 넣기 전에 앱이 꺼짐
-- 읽기(어떤 파일이 주인 없는지)는 DB가, 지우기는 Storage API가 한다 (Supabase는 storage.objects를 SQL로 지우는 것을 막는다)

-- 줄이 없는 파일 이름. 만든 지 p_min_age가 지난 것만: 올리는 중(파일은 올렸고 줄은 아직)인 사진을 지우지 않게
create or replace function public.list_orphan_photo_files(
  p_min_age interval default interval '1 hour',
  p_limit integer default 1000
)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select o.name
  from storage.objects o
  where o.bucket_id = 'photos'
    and o.created_at < now() - p_min_age
    and not exists (
      select 1 from public.photos p
      where p.path = o.name or p.thumb_path = o.name
    )
  order by o.created_at
  limit p_limit
$$;

-- 모든 사람의 파일을 보는 함수라 관리자 키(Edge Function)만
revoke execute on function public.list_orphan_photo_files(interval, integer) from public, anon, authenticated;
grant execute on function public.list_orphan_photo_files(interval, integer) to service_role;

-- 매일 한국 새벽 4시 30분 (UTC 19:30). 루틴 알림과 같은 방식: Vault의 주소·비밀 값으로 Edge Function을 부른다.
-- 비밀 값은 루틴 알림 것(reminder_cron_secret)을 같이 쓴다: "cron이 부르는 함수" 확인용이라 따로 둘 이유가 없고, 사용자가 새로 넣을 값이 없다
select cron.schedule(
  'sweep-photo-files',
  '30 19 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/sweep-photo-files',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reminder-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminder_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'project_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'reminder_cron_secret')
  $$
);
