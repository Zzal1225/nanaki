'use client';

// 'use client' 이유: 시트 열림·사진 바꾸기·지우기 확인이 브라우저에서 일어난다
import { useState } from 'react';
import { PHOTO_KIND_LABEL } from '@/features/records/schema/photoKinds';
import Button from '@/shared/ui/Button';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import Sheet from '@/shared/ui/Sheet';
import type { Photo } from '../api/photoStore';
import {
  useDeletePhoto,
  usePhotoUrls,
  useUploadPhoto,
} from '../hooks/usePhotos';
import PhotoPickButton from './PhotoPickButton';
import { photoErrorMessage } from './photoError';

type PhotoViewerProps = {
  photo: Photo | null;
  onClose: () => void;
  // 이 기록의 날짜 (바꾸기에서 "지난 사진"을 이 날짜까지의 다른 기록에서 찾는다)
  recordDate: string;
  // 이 사진이 기록의 마지막 내용인지 (사진만 있는 체형 기록의 마지막 한 장). 지우면 기록도 지운다
  isLastContent?: boolean;
  onRecordEmptied?: () => Promise<void>;
};

type ViewerBodyProps = {
  photo: Photo;
  onClose: () => void;
  recordDate: string;
  isLastContent: boolean;
  onRecordEmptied?: () => Promise<void>;
};

// 사진 크게 보기 + 바꾸기·지우기 (시트: 모바일 바텀시트 / PC 오른쪽 패널).
// 보기용 사진(1600px)은 열 때만 서명 링크를 받는다: 목록에서는 썸네일만 받아 데이터를 아낀다
export default function PhotoViewer({
  photo,
  onClose,
  recordDate,
  isLastContent = false,
  onRecordEmptied,
}: PhotoViewerProps) {
  return (
    <Sheet
      open={photo !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={photo ? `${PHOTO_KIND_LABEL[photo.kind]} 사진` : '사진'}
    >
      {photo && (
        <ViewerBody
          photo={photo}
          onClose={onClose}
          recordDate={recordDate}
          isLastContent={isLastContent}
          onRecordEmptied={onRecordEmptied}
        />
      )}
    </Sheet>
  );
}

function ViewerBody({
  photo,
  onClose,
  recordDate,
  isLastContent,
  onRecordEmptied,
}: ViewerBodyProps) {
  const urls = usePhotoUrls([photo.path]);
  const url = urls.data?.get(photo.path);
  const upload = useUploadPhoto(photo.recordId);
  const remove = useDeletePhoto(photo.recordId);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = PHOTO_KIND_LABEL[photo.kind];

  async function replace(file: File) {
    setError(null);
    try {
      await upload.mutateAsync({ kind: photo.kind, file, replacing: photo });
      onClose();
    } catch (failure) {
      setError(photoErrorMessage(failure));
    }
  }

  // 마지막 내용이면 사진을 먼저 지우고 기록을 지운다: 사진 지우기(서버)는 실패할 수 있어 먼저 해 두면 실패 때 아무것도 바뀌지 않고,
  // 기록 지우기는 기기 먼저(대기열)라 거의 실패하지 않는다. 반대 순서면 기록만 사라지고 사진이 남을 수 있다
  async function confirmDelete() {
    try {
      await remove.mutateAsync(photo);
      if (isLastContent) await onRecordEmptied?.();
      setIsConfirming(false);
      onClose();
    } catch {
      setIsConfirming(false);
      setError('사진을 지우지 못했어요. 잠시 후 다시 시도해 주세요');
    }
  }

  return (
    <div className='flex flex-col gap-4'>
      {/* 크기를 먼저 잡아(aspect) 링크를 받는 동안 자리가 흔들리지 않게.
          높이는 화면의 55%까지: 세로 사진이 시트를 다 채우면 아이폰에서 바꾸기·지우기가 스크롤 아래로 숨었다 (로컬 확인) */}
      <div
        className='overflow-hidden rounded-lg bg-surface-hover'
        style={{
          aspectRatio: `${photo.width} / ${photo.height}`,
          maxHeight: '55dvh',
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- 몇 분짜리 서명 링크라 next/image 최적화(서버가 다시 받아 저장)를 거치지 않는다
          <img
            src={url}
            alt={`${label} 사진`}
            width={photo.width}
            height={photo.height}
            className='size-full object-contain'
          />
        ) : urls.isError ? (
          <p role='alert' className='p-4 text-body-sm text-fg-primary'>
            사진을 불러오지 못했어요
          </p>
        ) : (
          <div aria-busy='true' className='size-full animate-pulse' />
        )}
      </div>
      {error && (
        <p role='alert' className='text-caption text-danger'>
          {error}
        </p>
      )}
      <div className='grid grid-cols-2 gap-2'>
        <PhotoPickButton
          kind={photo.kind}
          basis={{ recordId: photo.recordId, date: recordDate }}
          onPick={(file) => void replace(file)}
          onError={setError}
          onStart={() => setError(null)}
          disabled={upload.isPending}
          className='inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface text-body-sm font-semibold text-fg-primary hover:bg-surface-hover'
        >
          {upload.isPending ? '올리는 중…' : '바꾸기'}
        </PhotoPickButton>
        <Button variant='secondary' onClick={() => setIsConfirming(true)}>
          지우기
        </Button>
      </div>
      <ConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        // 사진만 있는 기록에서 마지막 사진을 지우면 기록이 빈 껍데기가 된다 → 기록도 지운다고 먼저 알린다 (2026-10-24 사용자 결정)
        title={isLastContent ? '이 기록이 삭제돼요' : '사진을 지울까요?'}
        description={
          isLastContent
            ? '이 사진이 기록에 남은 마지막 내용이라, 지우면 기록도 함께 지워져요. 되돌릴 수 없어요.'
            : '지운 사진은 되돌릴 수 없어요.'
        }
        confirmLabel={isLastContent ? '기록 삭제' : '지우기'}
        confirmVariant='danger'
        onConfirm={() => void confirmDelete()}
        isPending={remove.isPending}
      />
    </div>
  );
}
