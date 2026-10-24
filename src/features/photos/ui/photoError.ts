import {
  isGalleryKind,
  PHOTO_KIND_LABEL,
} from '@/features/records/schema/photoKinds';
import type { AttachPhotosResult } from '../api/attachNewRecordPhotos';
import { PhotoInputError } from '../api/photoStore';

// 사용자에게 보여 줄 실패 문구: 형식·로그인처럼 알 수 있는 것은 그대로, 나머지(네트워크·저장소)는 다시 시도 안내
export function photoErrorMessage(error: unknown): string {
  return error instanceof PhotoInputError
    ? error.message
    : '사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요';
}

export type PhotoNotice = { message: string; tone?: 'error' };

// 쓰기 화면에서 저장한 뒤 사진 결과 알림 (토스트). 다 올렸으면 알리지 않는다: 평소 저장과 같게.
// 어느 쪽이든 기록은 이미 저장됐다는 것을 먼저 말한다 (사진 때문에 기록까지 잃었다고 오해하지 않게)
export function newRecordPhotoNotice(
  result: AttachPhotosResult,
): PhotoNotice | null {
  if (result.status === 'done') return null;
  if (result.status === 'notOnServer') {
    return {
      message: '기록은 저장했어요. 사진은 연결되면 상세에서 붙여 주세요',
    };
  }
  // 칸 사진은 이름으로("정면·측면 사진"), 갤러리 사진은 장수로("사진 2장"): 후기 사진은 이름이 모두 "사진"이라 이름을 늘어놓으면 "사진·사진"이 된다
  const slotLabels = result.failedKinds
    .filter((kind) => !isGalleryKind(kind))
    .map((kind) => PHOTO_KIND_LABEL[kind]);
  const galleryCount = result.failedKinds.filter(isGalleryKind).length;
  const phrase = [
    slotLabels.length > 0 ? `${slotLabels.join('·')} 사진` : null,
    galleryCount > 0 ? `사진 ${galleryCount}장` : null,
  ]
    .filter(Boolean)
    .join(', ');
  return {
    message: `기록은 저장했지만 ${phrase}을 올리지 못했어요. 상세에서 다시 붙여 주세요`,
    tone: 'error',
  };
}
