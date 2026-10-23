import {
  listPendingRecordIds,
  sendPendingRecords,
} from '@/features/records/api/recordStore';
import type { PhotoKind } from '@/features/records/schema/photoKinds';
import { uploadPhoto } from './photoStore';

// 쓰기 화면에서 고른 사진을 방금 저장한 기록에 붙인다 (step4 37b2).
// 순서가 중요하다: 기록 쓰기는 "기기 먼저 → 대기열"이라 저장 직후엔 기록이 아직 서버에 없을 수 있다.
// 사진 표(photos.record_id)는 서버의 기록을 가리켜야 해서(FK + RLS가 기록 주인 확인), 기록을 먼저 보내고 서버에 간 것을 확인한 뒤 올린다.
// 고르지 않은 대안: 사진도 대기열에 넣어 나중에 올리기 → 몸 사진을 기기(IndexedDB)에 남기게 되고(CLAUDE.md: 몸 사진은 기기에 두지 않음),
// 대기열이 기록 말고 파일까지 다루게 돼 커진다. 오프라인이면 상세에서 나중에 붙이게 안내한다

export type PickedPhoto = { kind: PhotoKind; file: File };

// - done: 모두 올림
// - notOnServer: 기록이 서버에 가지 못해(오프라인·거절) 하나도 올리지 않음
// - partial: 일부(또는 전부) 올리기 실패. failedKinds에 못 올린 칸
export type AttachPhotosResult =
  | { status: 'done' }
  | { status: 'notOnServer' }
  | { status: 'partial'; failedKinds: PhotoKind[] };

// 바깥 일(대기열 보내기·서버에 있는지·올리기)은 받아서 쓴다: 순서 규칙만 단위 테스트하려고
export type AttachPhotosDeps = {
  sendPending: () => Promise<void>;
  listPending: () => Promise<string[]>;
  upload: (input: {
    recordId: string;
    kind: PhotoKind;
    file: File;
  }) => Promise<unknown>;
};

const DEFAULT_DEPS: AttachPhotosDeps = {
  sendPending: sendPendingRecords,
  listPending: listPendingRecordIds,
  upload: uploadPhoto,
};

export async function attachNewRecordPhotos(
  recordId: string,
  picks: readonly PickedPhoto[],
  deps: AttachPhotosDeps = DEFAULT_DEPS,
): Promise<AttachPhotosResult> {
  if (picks.length === 0) return { status: 'done' };

  // 보내기 실패는 여기서 던지지 않는다: 결과는 아래 "대기열에 남았나"로 판단한다
  await deps.sendPending().catch(() => undefined);
  const pending = await deps.listPending().catch(() => [recordId]);
  if (pending.includes(recordId)) return { status: 'notOnServer' };

  // 한 장씩 차례로: 동시에 올리면 느린 휴대폰 회선에서 둘 다 늦어지고, 압축(캔버스)도 메모리를 두 배로 쓴다.
  // 한 장이 실패해도 다음 장은 시도한다 (형식 문제처럼 그 장만의 실패일 수 있다)
  const failedKinds: PhotoKind[] = [];
  for (const pick of picks) {
    try {
      await deps.upload({ recordId, kind: pick.kind, file: pick.file });
    } catch {
      failedKinds.push(pick.kind);
    }
  }
  return failedKinds.length === 0
    ? { status: 'done' }
    : { status: 'partial', failedKinds };
}
