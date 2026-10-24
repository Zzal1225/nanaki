'use client';

// 'use client' 이유: 사진은 온라인에서 서명 링크로만 보여 주고, 올리기·연결 상태가 브라우저에서 일어난다
import { ImagePlus } from 'lucide-react';
import { useState } from 'react';
import { usePendingRecordIds } from '@/features/records/hooks/usePendingRecordIds';
import {
  PHOTO_KIND_LABEL,
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
import BodyCompareLink from '../compare/BodyCompareLink';
import { COMPARE_KINDS, type CompareKind } from '../compare/bodyCompare';
import PhotoPickButton from './PhotoPickButton';
import PhotoViewer from './PhotoViewer';
import { photoErrorMessage } from './photoError';

type RecordPhotosProps = {
  recordId: string;
  // 기록의 날짜: "지난 사진"(겹치기)을 이 날짜까지의 다른 기록에서 찾는다
  recordDate: string;
  // 타입 설정이 정한 사진 칸 (체형 = 정면·측면). 종류마다 한 장
  kinds: readonly PhotoKind[];
  // 기록에 사진 말고 다른 내용이 없는지 (사진만 있는 체형 기록). 그러면 마지막 사진을 지울 때 기록도 지운다
  isPhotoOnly?: boolean;
  onRecordEmptied?: () => Promise<void>;
};

// 기록 상세의 사진 칸 (step4 37b 눈바디). 칸마다 사진이 있으면 썸네일(누르면 크게 보기·바꾸기·지우기), 없으면 "＋ 정면 사진".
// 사진은 온라인 전용 (photoStore): 오프라인·아직 서버에 없는 기록(대기열)이면 안내만 한다.
// 서버에 없는 기록에 붙이면 DB가 막는다(기록 id 연결) → 보내진 뒤에 붙인다
export default function RecordPhotos({
  recordId,
  recordDate,
  kinds,
  isPhotoOnly = false,
  onRecordEmptied,
}: RecordPhotosProps) {
  const isOnline = useOnlineStatus();
  const isOnServer = !usePendingRecordIds().has(recordId);
  const photos = useRecordPhotos(recordId, isOnline && isOnServer);
  const list = photos.data ?? [];
  const thumbs = usePhotoUrls(list.map((photo) => photo.thumbPath).sort());
  const upload = useUploadPhoto(recordId);
  const [viewing, setViewing] = useState<Photo | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add(kind: PhotoKind, file: File) {
    setError(null);
    try {
      await upload.mutateAsync({ kind, file });
    } catch (failure) {
      setError(photoErrorMessage(failure));
    }
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
      <h2 className='text-body-sm font-medium text-fg-secondary'>사진</h2>
      {notice ? (
        <p className='rounded-lg border border-border bg-surface p-4 text-body-sm text-fg-secondary'>
          {notice}
        </p>
      ) : (
        <div className='grid grid-cols-2 gap-3'>
          {kinds.map((kind) => {
            const photo = list.find((item) => item.kind === kind);
            const label = PHOTO_KIND_LABEL[kind];
            if (photo) {
              const url = thumbs.data?.get(photo.thumbPath);
              return (
                <button
                  key={kind}
                  type='button'
                  onClick={() => setViewing(photo)}
                  aria-label={`${label} 사진 크게 보기`}
                  className='relative aspect-[3/4] overflow-hidden rounded-lg bg-surface-hover'
                >
                  {url && (
                    // eslint-disable-next-line @next/next/no-img-element -- 몇 분짜리 서명 링크라 next/image 최적화를 거치지 않는다
                    <img src={url} alt='' className='size-full object-cover' />
                  )}
                  <span className='absolute bottom-2 left-2 rounded-full bg-overlay px-2 py-0.5 text-caption font-semibold text-white'>
                    {label}
                  </span>
                </button>
              );
            }
            const isUploading =
              upload.isPending && upload.variables?.kind === kind;
            return (
              <PhotoPickButton
                key={kind}
                kind={kind}
                basis={{ recordId, date: recordDate }}
                onPick={(file) => void add(kind, file)}
                onError={setError}
                onStart={() => setError(null)}
                disabled={upload.isPending || photos.isPending}
                className='flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface text-body-sm font-medium text-fg-secondary hover:bg-surface-hover'
              >
                <ImagePlus
                  aria-hidden='true'
                  size={ICON_SIZE.lg}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
                {isUploading ? '올리는 중…' : `${label} 사진`}
              </PhotoPickButton>
            );
          })}
        </div>
      )}
      {error && (
        <p role='alert' className='text-caption text-danger'>
          {error}
        </p>
      )}
      {/* 이 기록 사진을 다른 날과 비교 (37d). 이 기록에 사진이 있는 자세만, 그 자세 사진이 2개 날짜 이상일 때 보인다 */}
      {!notice && list.length > 0 && (
        <BodyCompareLink
          recordDate={recordDate}
          kinds={COMPARE_KINDS.filter((kind: CompareKind) =>
            list.some((photo) => photo.kind === kind),
          )}
          label='이 사진 비교하기'
        />
      )}
      <PhotoViewer
        photo={viewing}
        onClose={() => setViewing(null)}
        recordDate={recordDate}
        isLastContent={isPhotoOnly && list.length === 1}
        onRecordEmptied={onRecordEmptied}
      />
    </section>
  );
}
