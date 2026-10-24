'use client';

// 'use client' 이유: 고른 파일의 미리보기(blob 주소)와 파일 고르기가 브라우저에서 일어난다
import { ImagePlus, X } from 'lucide-react';
import {
  PHOTO_KIND_LABEL,
  type PhotoKind,
} from '@/features/records/schema/photoKinds';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import PhotoPickButton from './PhotoPickButton';

// 고른 사진 한 장: 올릴 파일 + 미리보기 주소(URL.createObjectURL). 주소를 만들고 닫는 일은 들고 있는 쪽(RecordFormWithPhotos)이 한다
export type PickedPreview = { file: File; url: string };

type NewRecordPhotosProps = {
  title: string;
  // 쓰는 기록의 날짜: "지난 사진"을 이 날짜까지의 기록에서 찾는다
  recordDate: string;
  kinds: readonly PhotoKind[];
  picks: Partial<Record<PhotoKind, PickedPreview>>;
  onPick: (kind: PhotoKind, file: File) => void;
  onRemove: (kind: PhotoKind) => void;
  onError: (message: string | null) => void;
  isOnline: boolean;
  isDisabled: boolean;
  error: string | null;
};

// 쓰기 화면의 사진 칸 (step4 37b2). 상세의 사진 칸(RecordPhotos)과 모양을 맞추되, 여기서는 아직 올리지 않는다:
// 기록이 서버에 생긴 뒤에야 사진을 붙일 수 있어서(photos.record_id), 저장 때까지 기기 메모리에 들고만 있다 (attachNewRecordPhotos).
// 표시만 맡고 상태는 받는다: 저장 버튼(폼)과 같은 곳에서 고른 사진을 읽어야 해서
export default function NewRecordPhotos({
  title,
  recordDate,
  kinds,
  picks,
  onPick,
  onRemove,
  onError,
  isOnline,
  isDisabled,
  error,
}: NewRecordPhotosProps) {
  // 오프라인에선 새로 고르지 못하게 한다: 저장해도 기록이 서버에 가지 않아 사진을 붙일 수 없다. 이미 고른 사진은 빼기만 된다
  const canPick = isOnline && !isDisabled;

  return (
    <section aria-label='사진' className='flex flex-col gap-2'>
      {/* 오프라인 안내는 제목 옆에 (2026-10-24 사용자: 칸 아래보다 눈에 먼저 띄게, 문구도 짧게) */}
      <div className='flex flex-wrap items-baseline gap-x-2'>
        <h2 className='text-body-sm font-medium text-fg-primary'>{title}</h2>
        {!isOnline && (
          <p className='text-caption text-fg-secondary'>
            사진은 오프라인 상태에서 저장할 수 없어요.
          </p>
        )}
      </div>
      <div className='grid grid-cols-2 gap-3'>
        {kinds.map((kind) => {
          const label = PHOTO_KIND_LABEL[kind];
          const picked = picks[kind];
          if (!picked) {
            return (
              <PhotoPickButton
                key={kind}
                kind={kind}
                basis={{ date: recordDate }}
                onPick={(file) => onPick(kind, file)}
                onError={onError}
                onStart={() => onError(null)}
                disabled={!canPick}
                className='flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface text-body-sm font-medium text-fg-secondary hover:bg-surface-hover'
              >
                <ImagePlus
                  aria-hidden='true'
                  size={ICON_SIZE.lg}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
                {`${label} 사진`}
              </PhotoPickButton>
            );
          }
          // 바꾸기(사진을 누름)와 빼기(×)를 형제로 둔다: label 안에 button을 넣으면 누르는 곳이 겹쳐 빼기를 눌러도 파일 창이 열린다
          return (
            <div key={kind} className='relative aspect-[3/4]'>
              <PhotoPickButton
                kind={kind}
                basis={{ date: recordDate }}
                onPick={(file) => onPick(kind, file)}
                onError={onError}
                onStart={() => onError(null)}
                disabled={!canPick}
                className='block size-full overflow-hidden rounded-lg bg-surface-hover'
              >
                <span className='sr-only'>{`${label} 사진 바꾸기`}</span>
                {/* eslint-disable-next-line @next/next/no-img-element -- 기기 안의 blob 주소라 next/image 최적화를 거칠 수 없다 */}
                <img
                  src={picked.url}
                  alt=''
                  className='size-full object-cover'
                />
                <span className='absolute bottom-2 left-2 rounded-full bg-overlay px-2 py-0.5 text-caption font-semibold text-white'>
                  {label}
                </span>
              </PhotoPickButton>
              <button
                type='button'
                onClick={() => onRemove(kind)}
                disabled={isDisabled}
                aria-label={`${label} 사진 빼기`}
                // 44px 누르는 곳 안에 작은 동그라미: 사진 위에서도 보이게 어두운 바탕
                className='absolute top-0 right-0 flex size-11 items-center justify-center'
              >
                <span className='flex size-7 items-center justify-center rounded-full bg-overlay text-white'>
                  <X
                    aria-hidden='true'
                    size={ICON_SIZE.sm}
                    strokeWidth={ICON_STROKE_WIDTH}
                  />
                </span>
              </button>
            </div>
          );
        })}
      </div>
      {error && (
        <p role='alert' className='text-caption text-danger'>
          {error}
        </p>
      )}
    </section>
  );
}
