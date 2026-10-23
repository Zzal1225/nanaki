// 주인 없는 사진 파일 정리 (step4 37b). pg_cron이 하루 한 번 pg_net으로 부른다 (마이그레이션 20261023130000).
// DB 함수가 "사진 표에 줄이 없는" 파일을 고르고, 여기서 Storage API로 지운다 (DB에서는 Storage 파일을 지울 수 없다).
// 체험 계정 만료·지우기 실패·올리다 멈춘 사진의 파일이 남지 않게 한다 (몸 사진이 주인 없이 남지 않게)
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { isCronRequest, json, readServiceKey } from '../_shared/edge.ts';

// Storage가 한 번에 지울 수 있는 파일 수에 맞춰 나눠 지운다
const REMOVE_BATCH = 100;
// 한 번 실행에서 다루는 최대 파일 수 (함수 실행 시간 안에 끝나게). 남으면 다음 날 이어서
const MAX_FILES_PER_RUN = 1000;

Deno.serve(async (request) => {
  if (!isCronRequest(request)) return json({ error: 'unauthorized' }, 401);
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = readServiceKey();
  if (!url || !serviceKey) return json({ error: 'not configured' }, 503);

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.rpc('list_orphan_photo_files', {
    p_limit: MAX_FILES_PER_RUN,
  });
  if (error) return json({ error: error.message }, 500);
  const names = (data ?? []) as string[];

  let removed = 0;
  for (let start = 0; start < names.length; start += REMOVE_BATCH) {
    const batch = names.slice(start, start + REMOVE_BATCH);
    const { error: removeError } = await supabase.storage
      .from('photos')
      .remove(batch);
    if (removeError) {
      // 남은 것은 다음 날 다시 고른다. 파일 이름(사용자 id 포함)은 기록하지 않는다
      console.error('[sweep-photo-files] 삭제 실패', removeError.message);
      break;
    }
    removed += batch.length;
  }
  return json({ found: names.length, removed });
});
