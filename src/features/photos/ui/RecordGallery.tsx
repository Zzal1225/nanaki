'use client';

// 'use client' 이유: 사진은 온라인에서 서명 링크로만 보여 주고, 여러 장 올리기·연결 상태가 브라우저에서 일어난다
import { ImagePlus } from 'lucide-react';
import { useState } from 'react';
import { usePendingRecordIds } from '@/features/records/hooks/usePendingRecordIds';
import {
  PHOTO_KIND_MAX,
  type PhotoKind,
} from '@/features/records/schema/photoKinds';
import { useOnlineStatus } from '@/shared/network/useOnlineStatus';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import type { Photo } from '../api/photoStore';
import {
  usePhotoUrls,
  useRecordPhotos,
  useUploadPhoto,
} from '../hooks/usePhotos';
import { checkPhotoFile, PHOTO_FILE_MESSAGE } from '../photoImage';
import PhotoFileButton from './PhotoFileButton';
import PhotoViewer from './PhotoViewer';
import { photoErrorMessage } from './photoError';

type RecordGalleryProps = {
  recordId: string;
  recordDate: string;
  // 여러 장 붙는 종류 (후기). 최대 장수는 종류 규칙(PHOTO_KIND_MAX)
  kind: PhotoKind;
};

// 기록 상세의 사진 갤러리 (step4 38 후기 사진, 2026-10-24 사용자 결정: 가로 스크롤 한 줄). 시안 6의 사진 2장 배치를 여러 장으로 늘렸다.
// 누르면 크게 보기·지우기(바꾸기 없음), 끝의 "＋ 사진"으로 더 붙인다(여러 장을 한 번에, 원본 비율).
// 눈바디 칸(RecordPhotos)과 같은 규칙: 온라인 전용, 아직 서버에 없는 기록(대기열)이면 안내만
export default function RecordGallery({
  recordId,
  recordDate,
  kind,
}: RecordGalleryProps) {
  const isOnline = useOnlineStatus();
  const isOnServer = !usePendingRecordIds().has(recordId);
  const photos = useRecordPhotos(recordId, isOnline && isOnServer);
  const list = (photos.data ?? []).filter((photo) => photo.kind === kind);
  const thumbs = usePhotoUrls(list.map((photo) => photo.thumbPath).sort());
  const upload = useUploadPhoto(recordId);
  const [viewing, setViewing] = useState<Photo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const max = PHOTO_KIND_MAX[kind];

  // 고른 순서대로 한 장씩 (눈바디·쓰기 화면과 같은 이유: 느린 회선에서 동시에 올리면 모두 늦다)
  async function addMany(files: File[]) {
    setError(null);
    const room = max - list.length;
    const valid = files.filter((file) => {
      const check = checkPhotoFile(file);
      if (check !== 'ok') setError(PHOTO_FILE_MESSAGE[check]);
      return check === 'ok';
    });
    if (valid.length > room) setError(`사진은 ${max}장까지 붙일 수 있어요`);
    const accepted = valid.slice(0, room);
    for (const [index, file] of accepted.entries()) {
      setUploadingCount(accepted.length - index);
      try {
        await upload.mutateAsync({ kind, file });
      } catch (failure) {
        setError(photoErrorMessage(failure));
        break;
      }
    }
    setUploadingCount(0);
  }

  const notice = !isOnline
    ? '연결되면 사진을 볼 수 있어요'
    : !isOnServer
      ? '기록이 저장되면 사진을 붙일 수 있어요'
      : photos.isError
        ? '사진을 불러오지 못했어요'
        : null;

  return (
    <section aria-label='사진' className='flex flex-col gap-2'>
      {notice ? (
        <p className='rounded-lg border border-border bg-surface p-4 text-body-sm text-fg-secondary'>
          {notice}
        </p>
      ) : (
        <ul className='-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:-mx-6 md:px-6'>
          {list.map((photo, index) => {
            const url = thumbs.data?.get(photo.thumbPath);
            return (
              <li key={photo.id} className='shrink-0'>
                <button
                  type='button'
                  onClick={() => setViewing(photo)}
                  aria-label={`사진 ${index + 1} 크게 보기`}
                  // 높이 140(시안), 너비는 사진 비율대로 (원본 비율로 올렸으니 자르지 않고 보여 준다. 너무 긴 가로 사진만 최대 너비로)
                  className='block h-35 max-w-60 overflow-hidden rounded-md bg-surface-hover'
                  style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
                >
                  {url && (
                    // eslint-disable-next-line @next/next/no-img-element -- 몇 분짜리 서명 링크라 next/image 최적화를 거치지 않는다
                    <img src={url} alt='' className='size-full object-cover' />
                  )}
                </button>
              </li>
            );
          })}
          {list.length < max && (
            <li className='shrink-0'>
              <PhotoFileButton
                onPickMany={(files) => void addMany(files)}
                disabled={upload.isPending || photos.isPending}
                className='flex h-35 w-28 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-surface text-body-sm font-medium text-fg-secondary tabular-nums hover:bg-surface-hover'
              >
                <ImagePlus
                  aria-hidden='true'
                  size={ICON_SIZE.lg}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
                {uploadingCount > 0
                  ? `올리는 중… ${uploadingCount}`
                  : `사진 ${list.length}/${max}`}
              </PhotoFileButton>
            </li>
          )}
        </ul>
      )}
      {error && (
        <p role='alert' className='text-caption text-danger'>
          {error}
        </p>
      )}
      <PhotoViewer
        photo={viewing}
        onClose={() => setViewing(null)}
        recordDate={recordDate}
      />
    </section>
  );
}
