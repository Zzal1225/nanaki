import type { PhotoKind } from '@/features/records/schema/photoKinds';
import type { Tables } from '@/lib/supabase/database.types';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  checkPhotoFile,
  compressPhoto,
  PHOTO_FILE_MESSAGE,
} from '../photoImage';

// 사진 저장·조회·삭제의 유일한 입구 (step4 37a). 화면·훅은 Supabase Storage를 직접 부르지 않는다 (recordStore와 같은 규칙).
// 사진은 온라인 전용이다: 파일이 크고, 몸 사진을 기기에 남기지 않는다 (CLAUDE.md: 몸 사진 응답은 서비스 워커가 캐시하지 않는다.
// 서비스 워커는 다른 도메인(Supabase) 응답을 원래 저장하지 않는다, src/sw/sw.ts)

const BUCKET = 'photos';
// 서명 링크 유효 시간. 화면을 보는 동안만 열리고, 주소가 새어도 곧 닫힌다 (CLAUDE.md: 만료 링크로만)
export const PHOTO_URL_EXPIRES_SECONDS = 10 * 60;

export type { PhotoKind };

export type Photo = {
  id: string;
  recordId: string;
  kind: PhotoKind;
  path: string;
  thumbPath: string;
  width: number;
  height: number;
};

type PhotoRow = Tables<'photos'>;

function toPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    recordId: row.record_id,
    // DB check (front·side·review)를 통과한 값만 들어 있다
    kind: row.kind as PhotoKind,
    path: row.path,
    thumbPath: row.thumb_path,
    width: row.width,
    height: row.height,
  };
}

// 사용자에게 보여 줄 수 있는 실패 (형식·로그인). 그 밖의 실패(네트워크·저장소)는 Error 그대로
export class PhotoInputError extends Error {}

// 사진 한 장 올리기: 확인 → 기기에서 다듬기(회전·위치 정보 제거·압축) → 파일 두 개(보기용·썸네일) → 표에 한 줄.
// 표에 넣지 못하면 올린 파일을 지운다 (주인 없는 파일을 남기지 않게)
export async function uploadPhoto(input: {
  recordId: string;
  kind: PhotoKind;
  file: File;
}): Promise<Photo> {
  const check = checkPhotoFile(input.file);
  if (check !== 'ok') throw new PhotoInputError(PHOTO_FILE_MESSAGE[check]);

  const supabase = createSupabaseBrowserClient();
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId)
    throw new PhotoInputError('로그인이 풀렸어요. 다시 로그인해 주세요');

  const compressed = await compressPhoto(input.file);
  const id = crypto.randomUUID();
  const extension = compressed.type === 'image/webp' ? 'webp' : 'jpg';
  // 첫 폴더 = 주인 (버킷 RLS·표 check가 이것으로 막는다)
  const path = `${userId}/${id}.${extension}`;
  const thumbPath = `${userId}/${id}-thumb.${extension}`;

  const storage = supabase.storage.from(BUCKET);
  const options = { contentType: compressed.type, upsert: false };
  const uploaded: string[] = [];
  try {
    for (const [target, blob] of [
      [path, compressed.main],
      [thumbPath, compressed.thumb],
    ] as const) {
      const { error } = await storage.upload(target, blob, options);
      if (error) throw error;
      uploaded.push(target);
    }
    const { data, error } = await supabase
      .from('photos')
      .insert({
        id,
        record_id: input.recordId,
        kind: input.kind,
        path,
        thumb_path: thumbPath,
        width: compressed.width,
        height: compressed.height,
      })
      .select()
      .single();
    if (error) throw error;
    return toPhoto(data);
  } catch (error) {
    if (uploaded.length > 0)
      await storage.remove(uploaded).catch(() => undefined);
    throw error;
  }
}

// 기록 하나의 사진 (올린 순서)
export async function listPhotosOfRecord(recordId: string): Promise<Photo[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('record_id', recordId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data.map(toPhoto);
}

// 보여 줄 서명 링크들 (한 번에). 파일 주소 → 링크. 만든 링크는 PHOTO_URL_EXPIRES_SECONDS 뒤 닫힌다
export async function createPhotoUrls(
  paths: readonly string[],
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls([...paths], PHOTO_URL_EXPIRES_SECONDS);
  if (error) throw error;
  for (const item of data) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}

// 사진 한 장 지우기: 줄을 먼저 지우고 파일을 지운다.
// 반대 순서면 파일 삭제 뒤 줄 삭제가 실패할 때 "파일 없는 사진"이 화면에 남는다.
// 이 순서에서 파일 삭제가 실패하면 주인 없는 파일이 남고, 따로 도는 정리 작업이 지운다 (37b)
export async function deletePhoto(photo: Photo): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from('photos').delete().eq('id', photo.id);
  if (error) throw error;
  await supabase.storage
    .from(BUCKET)
    .remove([photo.path, photo.thumbPath])
    .catch(() => undefined);
}
