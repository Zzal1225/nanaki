'use client';

// 'use client' 이유: 끌어 옮기기(포인터)·틀 크기 재기(useFittedFrame)·캔버스로 결과 만들기가 모두 브라우저에서 일어난다
import { Layers, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useRef, useState, type PointerEvent } from 'react';
import {
  PHOTO_KIND_LABEL,
  type PhotoKind,
} from '@/features/records/schema/photoKinds';
import { formatMonthDotDay } from '@/shared/date/formatDisplayDate';
import { useOnlineStatus } from '@/shared/network/useOnlineStatus';
import Button from '@/shared/ui/Button';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import StepSlider from '@/shared/ui/StepSlider';
import type { LatestPhotoBasis } from '../api/photoStore';
import { useFittedFrame } from '../hooks/useFittedFrame';
import { useLatestPhoto, usePhotoUrls } from '../hooks/usePhotos';
import {
  clampView,
  dragView,
  formatPercent,
  INITIAL_VIEW,
  layoutCrop,
  OFFSET_MAX,
  OFFSET_STEP,
  OVERLAY_DEFAULT,
  renderCroppedPhoto,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  type CropView,
} from '../photoCrop';
import BodySilhouette from './BodySilhouette';
import PhotoFileButton from './PhotoFileButton';

// 자르기 창에 넘기는 사진: 원본 파일 + 미리보기 주소 + 회전을 바로잡은 크기
export type CropSource = {
  file: File;
  url: string;
  width: number;
  height: number;
};

type PhotoCropDialogProps = {
  source: CropSource | null;
  kind: PhotoKind;
  // "지난 사진" 기준: 지금 기록(빼고)과 그 날짜(그날이거나 앞선 기록만)
  basis: LatestPhotoBasis;
  // "다시 고르기"로 고른 파일이 안 맞을 때의 문구 (창 안에 보인다)
  pickError: string | null;
  onCancel: () => void;
  onRepick: (file: File) => void;
  onDone: (file: File) => void;
};

// 맞춰 자르기 (step4 37c1, 시안 P6b): 불러온 사진을 3:4 틀에 맞춘다. 점선 실루엣과 같은 자세의 지난 사진(반투명)을
// 기준으로 확대·위치를 맞춰, 사진마다 몸의 크기·자리가 같아지게 한다 → 비교 슬라이더(37d)에서 겹쳐 볼 수 있다.
// 2026-10-23 사용자 결정: 불러온 사진은 늘 이 창을 거친다 (틀을 꽉 채운 상태로 열려 바로 완료해도 된다).
// 주소를 바꾸는 화면이 아니라 전체 화면 창: 쓰기 화면에서 열면 입력 중인 폼이 그대로 남아야 한다
export default function PhotoCropDialog({
  source,
  kind,
  basis,
  pickError,
  onCancel,
  onRepick,
  onDone,
}: PhotoCropDialogProps) {
  const label = PHOTO_KIND_LABEL[kind];
  return (
    <Dialog.Root
      open={source !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          // 바깥이 없는 전체 화면. 100dvh: 모바일 주소창이 접히고 펴져도 아래 버튼이 화면 밖으로 밀리지 않게
          className='fixed inset-0 z-50 flex h-dvh flex-col bg-bg text-fg-primary'
        >
          <div className='flex h-14 shrink-0 items-center px-1 md:px-3'>
            <Dialog.Close
              aria-label='닫기'
              className='inline-flex size-11 items-center justify-center rounded-md hover:bg-surface-hover'
            >
              <X
                aria-hidden='true'
                size={ICON_SIZE.lg}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            </Dialog.Close>
            <Dialog.Title className='flex-1 text-center text-body font-semibold'>
              {`${label} 사진 맞추기`}
            </Dialog.Title>
            <span aria-hidden='true' className='size-11' />
          </div>
          {/* 사진이 바뀌면(다시 고르기) 확대·위치를 처음으로: key로 안쪽 상태를 새로 만든다 */}
          {source && (
            <CropEditor
              key={source.url}
              source={source}
              kind={kind}
              basis={basis}
              pickError={pickError}
              onRepick={onRepick}
              onDone={onDone}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type CropEditorProps = {
  source: CropSource;
  kind: PhotoKind;
  basis: LatestPhotoBasis;
  pickError: string | null;
  onRepick: (file: File) => void;
  onDone: (file: File) => void;
};

function CropEditor({
  source,
  kind,
  basis,
  pickError,
  onRepick,
  onDone,
}: CropEditorProps) {
  const [view, setView] = useState<CropView>(INITIAL_VIEW);
  const [overlay, setOverlay] = useState(OVERLAY_DEFAULT);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOnline = useOnlineStatus();
  const latest = useLatestPhoto(kind, basis, isOnline);
  const latestPhoto = latest.data?.photo;
  const latestUrls = usePhotoUrls(latestPhoto ? [latestPhoto.path] : []);
  const latestUrl = latestPhoto
    ? latestUrls.data?.get(latestPhoto.path)
    : undefined;

  const { stageRef, frame } = useFittedFrame<HTMLDivElement>();

  // 끌어 옮기기: 누른 채 움직인 만큼. 손가락이 틀 밖으로 나가도 계속 따라오게 포인터를 붙잡는다(setPointerCapture)
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  function startDrag(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY };
  }
  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const last = dragRef.current;
    if (!last || frame.width === 0) return;
    const delta = { x: event.clientX - last.x, y: event.clientY - last.y };
    dragRef.current = { x: event.clientX, y: event.clientY };
    setView((current) => dragView(current, delta, frame));
  }
  function endDrag() {
    dragRef.current = null;
  }

  async function finish() {
    setIsSaving(true);
    setError(null);
    try {
      onDone(await renderCroppedPhoto(source.file, view, `${kind}.jpg`));
    } catch {
      setError('사진을 만들지 못했어요. 다른 사진으로 다시 시도해 주세요');
      setIsSaving(false);
    }
  }

  const layout = layoutCrop(source, view);
  const updateView = (patch: Partial<CropView>) =>
    setView((current) => clampView({ ...current, ...patch }));

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] lg:flex-row lg:gap-6 lg:px-10 lg:pb-6'>
      <div
        ref={stageRef}
        className='relative flex min-h-0 flex-1 items-center justify-center'
      >
        <div
          // 끄는 동안 화면이 같이 스크롤되지 않게 (touch-none)
          className='relative cursor-grab touch-none overflow-hidden rounded-lg bg-black select-none active:cursor-grabbing'
          style={{ width: frame.width, height: frame.height }}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 기기 안의 blob 주소라 next/image 최적화를 거칠 수 없다 */}
          <img
            src={source.url}
            alt='맞출 사진'
            draggable={false}
            className='absolute max-w-none'
            style={{
              left: `${layout.left * 100}%`,
              top: `${layout.top * 100}%`,
              width: `${layout.width * 100}%`,
              height: `${layout.height * 100}%`,
            }}
          />
          {latestUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- 몇 분짜리 서명 링크라 next/image 최적화를 거치지 않는다
            <img
              src={latestUrl}
              alt=''
              draggable={false}
              className='pointer-events-none absolute inset-0 size-full object-cover'
              style={{ opacity: overlay }}
            />
          )}
          <BodySilhouette kind={kind} />
          {latest.data && (
            <span className='absolute top-3 left-3 flex h-7 items-center gap-1 rounded-full bg-surface-raised pr-3 pl-2 text-caption font-semibold text-fg-primary tabular-nums'>
              <Layers
                aria-hidden='true'
                size={14}
                strokeWidth={ICON_STROKE_WIDTH}
                className='text-accent'
              />
              {`지난 사진 ${formatMonthDotDay(latest.data.occurredAt)} 겹침`}
            </span>
          )}
        </div>
      </div>

      <div className='flex shrink-0 flex-col gap-3 lg:w-[360px]'>
        <div className='flex flex-col gap-1 rounded-lg bg-surface p-3 shadow-card'>
          {latestUrl && (
            <StepSlider
              label='겹치기'
              valueText={formatPercent(overlay)}
              value={overlay}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => setOverlay(Math.round(value * 100) / 100)}
            />
          )}
          <StepSlider
            label='확대'
            valueText={formatPercent(view.zoom)}
            value={view.zoom}
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={ZOOM_STEP}
            onChange={(zoom) => updateView({ zoom })}
          />
          <StepSlider
            label='가로'
            valueText={formatPercent(view.offsetX, true)}
            value={view.offsetX}
            min={-OFFSET_MAX}
            max={OFFSET_MAX}
            step={OFFSET_STEP}
            onChange={(offsetX) => updateView({ offsetX })}
          />
          <StepSlider
            label='세로'
            valueText={formatPercent(view.offsetY, true)}
            value={view.offsetY}
            min={-OFFSET_MAX}
            max={OFFSET_MAX}
            step={OFFSET_STEP}
            onChange={(offsetY) => updateView({ offsetY })}
          />
        </div>
        <p className='text-caption text-fg-secondary'>
          사진을 끌어 옮기거나, − + 버튼·방향키로 맞출 수 있어요
        </p>
        {(error ?? pickError) && (
          <p role='alert' className='text-caption text-danger'>
            {error ?? pickError}
          </p>
        )}
        <div className='grid grid-cols-2 gap-2 lg:mt-auto'>
          <PhotoFileButton
            onPick={onRepick}
            disabled={isSaving}
            className='inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-surface text-body font-semibold text-fg-primary hover:bg-surface-hover'
          >
            다시 고르기
          </PhotoFileButton>
          <Button
            onClick={() => void finish()}
            isLoading={isSaving}
            className='min-h-12 text-body'
          >
            완료
          </Button>
        </div>
      </div>
    </div>
  );
}
