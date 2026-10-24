'use client';

// 'use client' 이유: 카메라(getUserMedia)·영상·타이머·캔버스 찍기가 모두 브라우저에서 일어난다
// Image 아이콘은 ImageIcon으로: 이름이 Image면 접근성 lint가 <img>로 보고 alt를 요구한다
import { Image as ImageIcon, Layers, Timer, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useEffect, useRef, useState } from 'react';
import {
  PHOTO_KIND_LABEL,
  type PhotoKind,
} from '@/features/records/schema/photoKinds';
import { formatMonthDotDay } from '@/shared/date/formatDisplayDate';
import { useOnlineStatus } from '@/shared/network/useOnlineStatus';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import type { LatestPhotoBasis } from '../api/photoStore';
import { useFittedFrame } from '../hooks/useFittedFrame';
import { useLatestPhoto, usePhotoUrls } from '../hooks/usePhotos';
import { useObjectUrls } from '../hooks/useObjectUrls';
import {
  cameraErrorMessage,
  captureSourceRect,
  captureVideoFrame,
  nextTimer,
  type TimerSeconds,
} from '../photoCapture';
import { OVERLAY_DEFAULT } from '../photoCrop';
import BodySilhouette from './BodySilhouette';
import PhotoFileButton from './PhotoFileButton';

// 후면 카메라만 쓴다 (2026-10-24 아이폰 확인 뒤 사용자 결정): 눈바디는 거울 앞 전신샷이 흔하고, 그때 화면은 나를, 후면 카메라는 거울을 본다.
// 처음엔 전면(셀카, 거울처럼 보여 주고 실제 방향으로 저장)도 두었는데, 전면은 화각이 좁아 전신이 안 들어오고
// 전환·거울 처리·마지막 카메라 기억만 늘어서 뺐다. 감수한 것: 휴대폰을 세워 두고 화면을 보며 혼자 찍는 방식(전면 + 타이머)
// facingMode는 바람(조건이 아님)이라 후면이 없는 기기는 있는 카메라로 열린다
const FACING_MODE = 'environment';

type CameraDialogProps = {
  open: boolean;
  kind: PhotoKind;
  basis: LatestPhotoBasis;
  onClose: () => void;
  // 찍고 "사용"을 누른 사진 (3:4 1200×1600 JPEG, 화면에서 이미 맞췄으니 자르기를 건너뛴다)
  onCapture: (file: File) => void;
  // "갤러리에서 불러오기"로 고른 파일 → 부르는 쪽이 맞춰 자르기(37c1)로 보낸다
  onGallery: (file: File) => void;
};

// 눈바디 촬영 (step4 37c2, 시안 19). 손가락 기기에서만 연다 (useInAppCamera).
// 카메라 화면은 앱 테마와 상관없이 다크로 고정한다 (tokens.json exceptions.camera-screen): .dark 클래스를 이 화면에만 붙이면
// 다크 토큰(CSS 변수)이 이 안에서만 바뀐다.
// 영상은 3:4 틀(맞춰 자르기와 같은 틀) 안에만 보여 주고 틀 = 사진이다 (아이폰 기본 카메라의 4:3 모드와 같은 배치).
// 처음에는 영상을 화면 전체에 채우고 가운데 틀만 잘랐는데, 긴 화면에 맞춰 늘리느라 좌우가 잘리고 틀에서 또 잘려
// 카메라가 보는 폭의 절반쯤만 사진이 됐다 → 2배 확대된 것처럼 보여 거울 앞에서 전신이 안 들어왔다 (2026-10-24 아이폰 확인)
export default function CameraDialog({
  open,
  kind,
  basis,
  onClose,
  onCapture,
  onGallery,
}: CameraDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          className='dark fixed inset-0 z-50 h-dvh overflow-hidden bg-black text-fg-primary'
        >
          {/* 열릴 때만 그린다: 닫히면 안쪽이 사라지며 카메라를 끈다 (정리 함수) */}
          {open && (
            <CameraBody
              kind={kind}
              basis={basis}
              onCapture={onCapture}
              onGallery={onGallery}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type CameraBodyProps = Omit<CameraDialogProps, 'open' | 'onClose'>;

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function CameraBody({ kind, basis, onCapture, onGallery }: CameraBodyProps) {
  const label = PHOTO_KIND_LABEL[kind];
  const [timer, setTimer] = useState<TimerSeconds>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [shot, setShot] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOverlayOn, setIsOverlayOn] = useState(true);
  const isOnline = useOnlineStatus();
  const latest = useLatestPhoto(kind, basis, isOnline);
  const latestPhoto = latest.data?.photo;
  const latestUrls = usePhotoUrls(latestPhoto ? [latestPhoto.path] : []);
  const latestUrl = latestPhoto
    ? latestUrls.data?.get(latestPhoto.path)
    : undefined;
  const objectUrls = useObjectUrls();
  const { stageRef, frame } = useFittedFrame<HTMLDivElement>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  // 타이머 진행 중인 setInterval id. 객체 하나를 계속 써서 정리 함수가 마지막 값을 읽는다 (useObjectUrls와 같은 이유)
  const countdownRef = useRef<{ id: number | null }>({ id: null });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;
    navigator.mediaDevices
      .getUserMedia({
        // 세로 사진이라 세로로 긴 영상을 바란다 (ideal = 맞는 게 없으면 가까운 것으로)
        video: {
          facingMode: FACING_MODE,
          width: { ideal: 1440 },
          height: { ideal: 1920 },
        },
        audio: false,
      })
      .then((opened) => {
        // 여는 사이 화면을 닫았거나 카메라를 바꿨으면 바로 끈다 (안 끄면 카메라 표시등이 계속 켜져 있다)
        if (isCancelled) {
          stopStream(opened);
          return;
        }
        stream = opened;
        setError(null);
        const video = videoRef.current;
        if (video) {
          video.srcObject = opened;
          void video.play().catch(() => undefined);
        }
      })
      .catch((failure: unknown) => {
        if (!isCancelled) setError(cameraErrorMessage(failure));
      });
    return () => {
      isCancelled = true;
      stopStream(stream);
    };
  }, []);

  useEffect(() => {
    const countdownTimer = countdownRef.current;
    return () => {
      if (countdownTimer.id !== null) window.clearInterval(countdownTimer.id);
    };
  }, []);

  async function takePhoto() {
    const video = videoRef.current;
    const frameElement = frameRef.current;
    // 영상이 아직 첫 장을 받지 못했으면(크기 0) 찍지 않는다
    if (!video || !frameElement || video.videoWidth === 0) return;
    const box = video.getBoundingClientRect();
    const target = frameElement.getBoundingClientRect();
    try {
      const file = await captureVideoFrame(
        video,
        captureSourceRect({
          video: { width: video.videoWidth, height: video.videoHeight },
          box: { x: box.x, y: box.y, width: box.width, height: box.height },
          frame: {
            x: target.x,
            y: target.y,
            width: target.width,
            height: target.height,
          },
        }),
        `${kind}.jpg`,
      );
      setShot({ file, url: objectUrls.create(file) });
    } catch {
      setError('사진을 찍지 못했어요. 다시 시도해 주세요');
    }
  }

  function cancelCountdown() {
    if (countdownRef.current.id !== null) {
      window.clearInterval(countdownRef.current.id);
      countdownRef.current.id = null;
    }
    setCountdown(null);
  }

  function pressShutter() {
    if (countdown !== null) {
      cancelCountdown();
      return;
    }
    if (timer === 0) {
      void takePhoto();
      return;
    }
    let left: number = timer;
    setCountdown(left);
    countdownRef.current.id = window.setInterval(() => {
      left -= 1;
      if (left > 0) {
        setCountdown(left);
        return;
      }
      cancelCountdown();
      void takePhoto();
    }, 1000);
  }

  function retake() {
    objectUrls.revoke(shot?.url);
    setShot(null);
  }

  const isCounting = countdown !== null;
  const overlayButtonClass =
    'inline-flex h-11 items-center gap-2 rounded-full bg-surface px-4 text-body-sm font-semibold text-fg-primary';

  return (
    <div className='relative flex size-full flex-col'>
      <div className='flex shrink-0 items-center px-1 pt-[env(safe-area-inset-top)]'>
        <Dialog.Close
          aria-label='닫기'
          className='inline-flex size-11 items-center justify-center rounded-md text-fg-primary'
        >
          <X
            aria-hidden='true'
            size={ICON_SIZE.lg}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </Dialog.Close>
        <Dialog.Title className='flex-1 text-center text-body font-semibold'>
          {`${label} 촬영`}
        </Dialog.Title>
        <button
          type='button'
          onClick={() => setTimer(nextTimer(timer))}
          disabled={isCounting || shot !== null}
          aria-label={`타이머 ${timer === 0 ? '끔' : `${timer}초`}`}
          className='inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 text-body-sm font-semibold text-fg-primary disabled:text-fg-disabled'
        >
          <Timer aria-hidden='true' size={22} strokeWidth={ICON_STROKE_WIDTH} />
          {timer > 0 && <span aria-hidden='true'>{timer}</span>}
        </button>
      </div>

      <div
        ref={stageRef}
        // 여백 없이: 틀이 화면 폭을 다 쓰게 (위·아래 줄을 뺀 높이가 모자란 짧은 휴대폰은 높이에 맞춰 줄어든다)
        className='relative flex min-h-0 flex-1 items-center justify-center'
      >
        <div
          ref={frameRef}
          className='relative overflow-hidden'
          style={{ width: frame.width, height: frame.height }}
        >
          <video
            ref={videoRef}
            // 아이폰은 playsInline이 없으면 영상을 전체 화면 재생기로 연다. muted가 있어야 사용자 동작 없이 재생된다
            playsInline
            muted
            autoPlay
            aria-hidden='true'
            // 카메라 영상(대개 3:4)이 틀(3:4)에 그대로 들어가 잘리는 곳이 없다. 비율이 다른 카메라(16:9 등)만 남는 쪽이 조금 잘린다
            className='absolute inset-0 size-full object-cover'
          />
          {shot ? (
            // eslint-disable-next-line @next/next/no-img-element -- 기기 안의 blob 주소라 next/image 최적화를 거칠 수 없다
            <img
              src={shot.url}
              alt={`찍은 ${label} 사진`}
              className='absolute inset-0 size-full bg-black object-cover'
            />
          ) : (
            <>
              {latestUrl && isOverlayOn && (
                // eslint-disable-next-line @next/next/no-img-element -- 몇 분짜리 서명 링크라 next/image 최적화를 거치지 않는다
                <img
                  src={latestUrl}
                  alt=''
                  className='pointer-events-none absolute inset-0 size-full object-cover'
                  style={{ opacity: OVERLAY_DEFAULT }}
                />
              )}
              <BodySilhouette kind={kind} />
              {isCounting && (
                <span
                  aria-live='assertive'
                  className='absolute inset-0 flex items-center justify-center text-[96px] leading-none font-bold text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]'
                >
                  {countdown}
                </span>
              )}
            </>
          )}
          {error && !shot && (
            <p
              role='alert'
              className='absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-lg bg-surface p-4 text-center text-body-sm text-fg-primary'
            >
              {error}
            </p>
          )}
          {!shot && !error && (
            <span className='absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-overlay px-3 py-1.5 text-body-sm whitespace-nowrap text-white'>
              실루엣에 몸을 맞춰 주세요
            </span>
          )}
        </div>
      </div>

      <div className='flex shrink-0 flex-col gap-3 px-8 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]'>
        {shot ? (
          // 높이를 찍기 화면의 아래 줄과 같게(겹치기 44 + 셔터 72 + 갤러리 44 + 간격 24 = 184px): 다르면 틀 크기가 바뀌어 찍은 사진이 튀어 보인다 (로컬 확인)
          <div className='grid h-[184px] grid-cols-2 content-center gap-3'>
            <button
              type='button'
              onClick={retake}
              className='inline-flex min-h-12 items-center justify-center rounded-md bg-surface text-body font-semibold text-fg-primary'
            >
              다시 찍기
            </button>
            <button
              type='button'
              onClick={() => onCapture(shot.file)}
              className='inline-flex min-h-12 items-center justify-center rounded-md bg-accent text-body font-semibold text-accent-foreground'
            >
              사용
            </button>
          </div>
        ) : (
          <>
            <div className='flex h-11 justify-center'>
              {latest.data && latestUrl && (
                <button
                  type='button'
                  onClick={() => setIsOverlayOn(!isOverlayOn)}
                  aria-pressed={isOverlayOn}
                  className={`${overlayButtonClass} text-caption ${isOverlayOn ? '' : 'opacity-60'}`}
                >
                  <Layers
                    aria-hidden='true'
                    size={ICON_SIZE.sm}
                    strokeWidth={ICON_STROKE_WIDTH}
                    className='text-accent'
                  />
                  {`지난 사진 겹치기 · ${formatMonthDotDay(latest.data.occurredAt)}`}
                </button>
              )}
            </div>
            {/* 셔터 하나만 가운데 (카메라 전환은 뺐다) */}
            <div className='flex items-center justify-center'>
              <button
                type='button'
                onClick={pressShutter}
                disabled={error !== null}
                aria-label={isCounting ? '타이머 취소' : '찍기'}
                className='flex size-18 items-center justify-center rounded-full border-4 border-white p-1 disabled:opacity-40'
              >
                <span
                  className={`size-full rounded-full ${isCounting ? 'scale-50 rounded-md bg-danger' : 'bg-white'}`}
                />
              </button>
            </div>
            <div className='flex justify-center'>
              <PhotoFileButton
                onPick={onGallery}
                disabled={isCounting}
                className={overlayButtonClass}
              >
                <ImageIcon
                  aria-hidden='true'
                  size={18}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
                갤러리에서 불러오기
              </PhotoFileButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
