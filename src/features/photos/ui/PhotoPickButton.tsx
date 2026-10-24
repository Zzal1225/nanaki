'use client';

// 'use client' 이유: 기기 능력(카메라)을 보고, 고른 파일을 기기에서 읽고(크기·회전) 카메라·자르기 창을 열고 닫는다
import { useState, type ReactNode } from 'react';
import type { PhotoKind } from '@/features/records/schema/photoKinds';
import type { LatestPhotoBasis } from '../api/photoStore';
import { useInAppCamera } from '../hooks/useInAppCamera';
import { useObjectUrls } from '../hooks/useObjectUrls';
import { readImageSize } from '../photoCrop';
import { checkPhotoFile, PHOTO_FILE_MESSAGE } from '../photoImage';
import CameraDialog from './CameraDialog';
import PhotoCropDialog, { type CropSource } from './PhotoCropDialog';
import PhotoFileButton from './PhotoFileButton';

type PhotoPickButtonProps = {
  kind: PhotoKind;
  basis: LatestPhotoBasis;
  // 자른 결과 또는 찍은 사진(3:4 JPEG). 부르는 쪽은 예전처럼 "파일 하나"만 받는다 → 올리기 경로(상세·쓰기 화면·바꾸기)는 그대로
  onPick: (file: File) => void;
  // 고를 때 알 수 있는 실패 (형식·크기·읽을 수 없는 그림)
  onError: (message: string) => void;
  // 새로 고르기 시작 (부르는 쪽이 지난 오류 문구를 지운다)
  onStart?: () => void;
  disabled?: boolean;
  className: string;
  children: ReactNode;
};

// 사진 고르기 → 확인 → 맞춰 자르기 → 결과 (step4 37c1). 사진 칸 버튼은 모두 이것을 쓴다 (상세·쓰기 화면·바꾸기).
// 손가락 기기 + 카메라(37c2)면 누를 때 파일 창 대신 앱 안 카메라를 연다: 실루엣에 맞춰 찍어 자르기를 건너뛴다.
// 카메라의 "갤러리에서 불러오기"는 이 흐름(확인 → 자르기)으로 다시 들어온다
// 확인을 자르기 앞에 두는 이유: HEIC·너무 큰 파일은 브라우저가 그림을 펼치지 못하거나 메모리가 모자라, 자르기 창이 빈 채로 열린다
export default function PhotoPickButton({
  kind,
  basis,
  onPick,
  onError,
  onStart,
  disabled,
  className,
  children,
}: PhotoPickButtonProps) {
  const [source, setSource] = useState<CropSource | null>(null);
  // 자르기 창 안에서 "다시 고르기"가 실패했을 때: 창 뒤(부르는 쪽)에 알리면 가려서 안 보인다 → 창 안에 보여 준다
  const [repickError, setRepickError] = useState<string | null>(null);
  const objectUrls = useObjectUrls();
  const canUseCamera = useInAppCamera();
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  async function open(file: File) {
    const isRepick = source !== null;
    const fail = (message: string) =>
      isRepick ? setRepickError(message) : onError(message);
    if (!isRepick) onStart?.();
    setRepickError(null);
    const check = checkPhotoFile(file);
    if (check !== 'ok') {
      fail(PHOTO_FILE_MESSAGE[check]);
      return;
    }
    try {
      const size = await readImageSize(file);
      const url = objectUrls.create(file);
      objectUrls.revoke(source?.url);
      setSource({ file, url, ...size });
    } catch {
      fail('사진을 읽지 못했어요. 다른 사진으로 다시 시도해 주세요');
    }
  }

  function close() {
    objectUrls.revoke(source?.url);
    setSource(null);
    setRepickError(null);
  }

  return (
    <>
      {canUseCamera ? (
        <button
          type='button'
          onClick={() => {
            onStart?.();
            setIsCameraOpen(true);
          }}
          disabled={disabled}
          // 파일 버튼(label)과 같은 모양: 비활성일 때 흐리게
          className={`${className} disabled:opacity-60`}
        >
          {children}
        </button>
      ) : (
        <PhotoFileButton
          onPick={(file) => void open(file)}
          disabled={disabled}
          className={className}
        >
          {children}
        </PhotoFileButton>
      )}
      <CameraDialog
        open={isCameraOpen}
        kind={kind}
        basis={basis}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(file) => {
          setIsCameraOpen(false);
          onPick(file);
        }}
        onGallery={(file) => {
          setIsCameraOpen(false);
          void open(file);
        }}
      />
      <PhotoCropDialog
        source={source}
        kind={kind}
        basis={basis}
        pickError={repickError}
        onCancel={close}
        onRepick={(file) => void open(file)}
        onDone={(file) => {
          close();
          onPick(file);
        }}
      />
    </>
  );
}
