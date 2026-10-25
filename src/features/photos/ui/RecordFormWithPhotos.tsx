'use client';

// 'use client' 이유: 고른 사진(파일·미리보기 주소)과 연결 상태를 들고, 저장 뒤 브라우저에서 사진을 올린다
import { useState } from 'react';
import RecordForm from '@/features/records/form/RecordForm';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import {
  isGalleryKind,
  PHOTO_KIND_MAX,
  type PhotoKind,
} from '@/features/records/schema/photoKinds';
import { useDiscardRecord } from '@/features/records/hooks/useDeleteRecord';
import {
  getContentHint,
  getPhotoPlacement,
  hasFieldValues,
  type RecordType,
} from '@/features/records/schema/recordTypes';
import { toLocalDateString } from '@/shared/date/toLocalDateString';
import { useOnlineStatus } from '@/shared/network/useOnlineStatus';
import { useToastStore } from '@/shared/toast/toastStore';
import {
  attachNewRecordPhotos,
  type PickedPhoto,
} from '../api/attachNewRecordPhotos';
import { useObjectUrls } from '../hooks/useObjectUrls';
import { checkPhotoFile, PHOTO_FILE_MESSAGE } from '../photoImage';
import NewRecordGallery, { type GalleryPick } from './NewRecordGallery';
import NewRecordPhotos, { type PickedPreview } from './NewRecordPhotos';
import { newRecordPhotoNotice } from './photoError';

type RecordFormWithPhotosProps = {
  type: RecordType;
  kinds: readonly PhotoKind[];
  date?: string;
  doneHref?: string;
};

// 사진 칸이 있는 타입(타입 설정 photoKinds: 체형 = 정면·측면)의 쓰기 폼 (step4 37b2, 2026-10-23 사용자 결정: 사진은 쓰기 화면 + 상세 둘 다).
// 폼(RecordForm)은 사진을 모른다: 메모 아래 구역(section)과 저장 뒤 할 일(onCreated)만 빌려 쓴다 (가계부의 고정지출 체크와 같은 방식).
// 저장 순서: 기록은 평소처럼 기기에 먼저 → 온라인이면 기록을 보내고 사진을 올린다(attachNewRecordPhotos). 그동안 저장 버튼은 로딩으로 남는다
export default function RecordFormWithPhotos({
  type,
  kinds,
  date,
  doneHref,
}: RecordFormWithPhotosProps) {
  const [picks, setPicks] = useState<Partial<Record<PhotoKind, PickedPreview>>>(
    {},
  );
  // 갤러리(후기 사진, 여러 장): 고른 순서대로
  const [galleryPicks, setGalleryPicks] = useState<GalleryPick[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);
  const isOnline = useOnlineStatus();
  const showToast = useToastStore((state) => state.showToast);

  // 미리보기 주소(blob:)는 바꾸기·빼기·화면 떠날 때 닫는다 (useObjectUrls)
  const objectUrls = useObjectUrls();
  const discardRecord = useDiscardRecord();

  // 형식 확인(HEIC 안내)과 맞춰 자르기는 PhotoPickButton이 끝냈다: 여기 오는 파일은 3:4로 자른 JPEG
  function pick(kind: PhotoKind, file: File) {
    setError(null);
    const url = objectUrls.create(file);
    objectUrls.revoke(picks[kind]?.url);
    setPicks({ ...picks, [kind]: { file, url } });
  }

  // 한 칸에 한 장인 종류(정면·측면)와 여러 장인 종류(후기)를 나눈다 (종류 규칙 PHOTO_KIND_MAX, 타입 이름으로 가르지 않는다)
  const slotKinds = kinds.filter((kind) => !isGalleryKind(kind));
  const galleryKind = kinds.find(isGalleryKind);
  const galleryMax = galleryKind ? PHOTO_KIND_MAX[galleryKind] : 0;

  // 갤러리는 자르기를 거치지 않으니 형식·크기 확인을 여기서 (HEIC 안내). 최대 장수를 넘는 것은 받지 않고 알린다
  function pickToGallery(files: File[]) {
    setError(null);
    const room = galleryMax - galleryPicks.length;
    const accepted: GalleryPick[] = [];
    for (const file of files) {
      const check = checkPhotoFile(file);
      if (check !== 'ok') {
        setError(PHOTO_FILE_MESSAGE[check]);
        continue;
      }
      if (accepted.length >= room) {
        setError(`사진은 ${galleryMax}장까지 붙일 수 있어요`);
        break;
      }
      accepted.push({ file, url: objectUrls.create(file) });
    }
    if (accepted.length > 0) setGalleryPicks([...galleryPicks, ...accepted]);
  }

  function removeFromGallery(url: string) {
    objectUrls.revoke(url);
    setGalleryPicks(galleryPicks.filter((pick) => pick.url !== url));
  }

  function remove(kind: PhotoKind) {
    objectUrls.revoke(picks[kind]?.url);
    const next = { ...picks };
    delete next[kind];
    setPicks(next);
  }

  const list: PickedPhoto[] = [
    ...slotKinds.flatMap((kind) => {
      const picked = picks[kind];
      return picked ? [{ kind, file: picked.file }] : [];
    }),
    ...(galleryKind
      ? galleryPicks.map((pick) => ({ kind: galleryKind, file: pick.file }))
      : []),
  ];
  // 폼 검사(체중·허리둘레·사진 중 1개 이상)와 사진만 있는 기록의 제목("정면 사진")에 넘기는 사진 종류. 오프라인이면 없음:
  // 사진은 저장 뒤 서버로 올라가는데 오프라인이면 못 올라가서, 사진만 고른 기록이 빈 기록으로 남는다 (2026-10-24 사용자: 빈 껍데기를 막을 것)
  const photoKinds = isOnline ? list.map((photo) => photo.kind) : [];

  // 기록은 이미 저장됐다. 숫자가 있는 기록이면 사진 실패는 던지지 않고 알리기만 한다
  // (던지면 폼이 저장 화면에 멈추고, 다시 누르면 기록이 두 개 생긴다).
  // 사진만 있는 기록인데 한 장도 못 올렸으면 빈 기록이 된다 → 방금 저장한 기록을 거둬들이고 폼에 남아 다시 시도하게 한다
  async function handleCreated(entry: RecordEntry) {
    if (list.length === 0) return;
    // 오프라인이면 보내기를 시도하지 않는다: 요청이 시간 초과(15초)까지 저장 버튼을 붙잡을 수 있다
    if (!isOnline) {
      const notice = newRecordPhotoNotice({ status: 'notOnServer' });
      if (notice) showToast(notice);
      return;
    }
    setIsAttaching(true);
    try {
      const result = await attachNewRecordPhotos(entry.id, list);
      const isNoneUploaded =
        result.status === 'notOnServer' ||
        (result.status === 'partial' &&
          result.failedKinds.length === list.length);
      if (isNoneUploaded && !hasFieldValues(entry)) {
        await discardRecord.mutateAsync(entry.id).catch(() => undefined);
        setError(
          '사진을 올리지 못해 저장하지 않았어요. 잠시 후 다시 시도해 주세요',
        );
        // 던져서 폼이 이동하지 않게 한다 (RecordForm은 onCreated가 던지면 그 자리에 남는다)
        throw new Error('사진만 있는 기록의 사진을 올리지 못함');
      }
      const notice = newRecordPhotoNotice(result);
      if (notice) showToast(notice);
    } finally {
      setIsAttaching(false);
    }
  }

  return (
    <RecordForm
      mode='create'
      type={type}
      date={date}
      doneHref={doneHref}
      photoKinds={photoKinds}
      sectionPlacement={getPhotoPlacement(type)}
      section={
        <>
          {slotKinds.length > 0 && (
            <NewRecordPhotos
              // 폼 위에 "체중, 허리둘레, 사진 중 1개 이상" 안내가 있으면 "(선택)"을 붙이지 않는다
              title={getContentHint(type) ? '사진' : '사진 (선택)'}
              // 시작 날짜(홈에서 고른 날 또는 오늘). 폼에서 날짜를 바꿔도 따라가지 않는다: 날짜 칸은 폼(RecordForm) 안에 있어서 (감수한 것)
              recordDate={date ?? toLocalDateString(new Date())}
              kinds={slotKinds}
              picks={picks}
              onPick={pick}
              onRemove={remove}
              onError={setError}
              isOnline={isOnline}
              isDisabled={isAttaching}
              error={error}
            />
          )}
          {galleryKind && (
            <NewRecordGallery
              picks={galleryPicks}
              max={galleryMax}
              onPick={pickToGallery}
              onRemove={removeFromGallery}
              isOnline={isOnline}
              isDisabled={isAttaching}
              error={slotKinds.length > 0 ? null : error}
            />
          )}
        </>
      }
      onCreated={handleCreated}
    />
  );
}
