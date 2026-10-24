'use client';

// 'use client' 이유: 고른 파일의 미리보기(blob 주소)와 여러 장 고르기가 브라우저에서 일어난다
import { ImagePlus, X } from 'lucide-react';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import PhotoFileButton from './PhotoFileButton';

// 고른 사진 한 장 (갤러리). key: 같은 파일 이름이 겹쳐도 구분하려고 미리보기 주소를 쓴다
export type GalleryPick = { file: File; url: string };

type NewRecordGalleryProps = {
  picks: readonly GalleryPick[];
  max: number;
  onPick: (files: File[]) => void;
  onRemove: (url: string) => void;
  isOnline: boolean;
  isDisabled: boolean;
  error: string | null;
};

// 쓰기 화면의 후기 사진 (step4 38, 시안 5: "사진 (선택 · 최대 5장)"). 첫 칸 "＋ n/5"에서 여러 장을 한 번에 고르고,
// 사진마다 ×로 뺀다. 원본 비율 그대로 올리므로(2026-10-24 사용자 결정) 맞춰 자르기 없이 바로 칸에 들어간다.
// 저장 때까지 메모리에만 들고 있다가, 기록을 보낸 뒤 올린다 (RecordFormWithPhotos → attachNewRecordPhotos, 눈바디와 같은 길)
export default function NewRecordGallery({
  picks,
  max,
  onPick,
  onRemove,
  isOnline,
  isDisabled,
  error,
}: NewRecordGalleryProps) {
  const isFull = picks.length >= max;
  // 오프라인에선 새로 고르지 못한다: 저장해도 기록이 서버에 가지 않아 사진을 붙일 수 없다. 이미 고른 사진은 빼기만 된다
  const canPick = isOnline && !isDisabled && !isFull;

  return (
    <section aria-label='사진' className='flex flex-col gap-2'>
      <div className='flex flex-wrap items-baseline gap-x-2'>
        <h2 className='text-body-sm font-medium text-fg-primary'>
          사진{' '}
          <span className='font-normal text-fg-secondary'>
            {`(선택 · 최대 ${max}장)`}
          </span>
        </h2>
        {!isOnline && (
          <p className='text-caption text-fg-secondary'>
            사진은 오프라인 상태에서 저장할 수 없어요.
          </p>
        )}
      </div>
      {/* 넘치면 가로로 밀어 본다 (모바일 한 줄에 88px 칸 3~4개) */}
      <ul className='-mx-4 flex gap-2 overflow-x-auto px-4 pt-1.5 pb-1 md:-mx-6 md:px-6'>
        <li className='shrink-0'>
          <PhotoFileButton
            onPickMany={onPick}
            disabled={!canPick}
            className='flex size-22 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-fg-secondary bg-surface text-caption font-medium text-fg-secondary tabular-nums hover:bg-surface-hover'
          >
            <ImagePlus
              aria-hidden='true'
              size={ICON_SIZE.lg}
              strokeWidth={ICON_STROKE_WIDTH}
            />
            <span aria-hidden='true'>{`${picks.length} / ${max}`}</span>
            <span className='sr-only'>{`사진 추가, ${picks.length}장 / 최대 ${max}장`}</span>
          </PhotoFileButton>
        </li>
        {picks.map((pick, index) => (
          <li key={pick.url} className='relative size-22 shrink-0'>
            {/* eslint-disable-next-line @next/next/no-img-element -- 기기 안의 blob 주소라 next/image 최적화를 거칠 수 없다 */}
            <img
              src={pick.url}
              alt={`고른 사진 ${index + 1}`}
              className='size-full rounded-md object-cover'
            />
            <button
              type='button'
              onClick={() => onRemove(pick.url)}
              disabled={isDisabled}
              aria-label={`사진 ${index + 1} 빼기`}
              // 44px 누르는 곳을 모서리에 걸쳐 둔다 (시안: 오른쪽 위 -6px)
              className='absolute -top-1.5 -right-1.5 flex size-11 items-center justify-center'
            >
              <span className='flex size-6 items-center justify-center rounded-full bg-fg-primary text-surface'>
                <X
                  aria-hidden='true'
                  size={14}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role='alert' className='text-caption text-danger'>
          {error}
        </p>
      )}
    </section>
  );
}
