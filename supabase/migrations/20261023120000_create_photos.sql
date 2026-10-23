-- step4 37a 사진 저장소: 비공개 버킷 + 사진 표. 눈바디(체형 정면·측면)와 후기 사진이 같은 모양을 쓴다 (2026-10-23 사용자 결정: 따로 두는 표).
-- 몸 사진은 민감하다 (CLAUDE.md): 비공개 버킷, 볼 때는 만료 링크만, AI·보고서에는 넣지 않는다. 기기에서 압축·EXIF 회전·위치 정보 제거 뒤 올린다

-- ── 버킷 ───────────────────────────────────────────────
-- public = false: 주소를 알아도 열리지 않는다. 볼 때는 몇 분짜리 서명 링크(createSignedUrl)로만.
-- 한 장 2MiB까지(압축 뒤 긴 변 1600px WebP는 보통 수백 KB), 기기에서 바꾼 형식만 받는다:
-- WebP를 못 만드는 브라우저(옛 iOS Safari)는 JPEG로 만든다 (src/features/photos/photoImage.ts)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

-- 파일 주소는 '{user_id}/{photo_id}.webp' (썸네일 '{photo_id}-thumb.webp'). 첫 폴더 = 주인.
-- RLS: 본인 폴더만 읽고·올리고·지운다. 고치기(update)는 없다: 사진을 바꾸면 새 파일로 올리고 옛 것을 지운다
create policy "본인 사진 파일 조회"
on storage.objects for select
to authenticated
using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "본인 사진 파일 올리기"
on storage.objects for insert
to authenticated
with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "본인 사진 파일 삭제"
on storage.objects for delete
to authenticated
using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ── 사진 표 ─────────────────────────────────────────────
-- 사진 한 장 = 한 줄. 어느 기록의 무슨 사진인지만 담는다 (파일은 버킷에).
-- 기록을 지워도(소프트 삭제) 줄은 남는다: 5초 되돌리기로 살리면 사진도 그대로여야 한다.
-- 계정을 지우면 cascade로 줄이 지워지고, 파일은 계정 삭제 API가 먼저 지운다 (DB에서는 Storage 파일을 지울 수 없다)
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  record_id uuid not null references public.records (id) on delete cascade,
  -- front·side = 눈바디 정면·측면, review = 후기 사진
  kind text not null check (kind in ('front', 'side', 'review')),
  -- 버킷 안 주소. 첫 폴더가 주인이어야 한다 (남의 폴더 주소를 내 줄에 적지 못하게)
  path text not null unique check (split_part(path, '/', 1) = user_id::text),
  thumb_path text not null unique check (split_part(thumb_path, '/', 1) = user_id::text),
  -- 압축한 사진의 크기. 화면이 자리를 먼저 잡아 그림이 늦게 와도 흔들리지 않게 (CLS)
  width integer not null check (width between 1 and 4000),
  height integer not null check (height between 1 and 4000),
  created_at timestamptz not null default now()
);

-- 기록 상세는 "이 기록의 사진", 비교 슬라이더는 "내 정면 사진 전부"로 읽는다
create index photos_record_id_idx on public.photos (record_id);
create index photos_user_kind_idx on public.photos (user_id, kind, created_at);

alter table public.photos enable row level security;

-- 사진을 바꾸면 줄을 지우고 새로 넣는다 (고치기 없음)
grant select, insert, delete on public.photos to authenticated;

create policy "본인 사진 조회"
on public.photos for select
to authenticated
using ((select auth.uid()) = user_id);

-- 내 기록에만 붙인다: 남의 기록 id를 적어 넣지 못하게 기록의 주인도 확인한다
create policy "본인 기록에 사진 추가"
on public.photos for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.records r
    where r.id = record_id and r.user_id = (select auth.uid())
  )
);

create policy "본인 사진 삭제"
on public.photos for delete
to authenticated
using ((select auth.uid()) = user_id);
