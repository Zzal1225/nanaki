'use client';

// 'use client' 이유: 고른 사진(파일·미리보기 주소)과 연결 상태를 들고, 저장 뒤 브라우저에서 사진을 올린다
import { useState } from 'react';
import RecordForm from '@/features/records/form/RecordForm';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import type { PhotoKind } from '@/features/records/schema/photoKinds';
import type { RecordType } from '@/features/records/schema/recordTypes';
import { useOnlineStatus } from '@/shared/network/useOnlineStatus';
import { useToastStore } from '@/shared/toast/toastStore';
import {
  attachNewRecordPhotos,
  type PickedPhoto,
} from '../api/attachNewRecordPhotos';
import { useObjectUrls } from '../hooks/useObjectUrls';
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
  const [error, setError] = useState<string | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);
  const isOnline = useOnlineStatus();
  const showToast = useToastStore((state) => state.showToast);

  // 미리보기 주소(blob:)는 바꾸기·빼기·화면 떠날 때 닫는다 (useObjectUrls)
  const objectUrls = useObjectUrls();

  // 형식 확인(HEIC 안내)과 맞춰 자르기는 PhotoPickButton이 끝냈다: 여기 오는 파일은 3:4로 자른 JPEG
  function pick(kind: PhotoKind, file: File) {
    setError(null);
    const url = objectUrls.create(file);
    objectUrls.revoke(picks[kind]?.url);
    setPicks({ ...picks, [kind]: { file, url } });
  }

  function remove(kind: PhotoKind) {
    objectUrls.revoke(picks[kind]?.url);
    const next = { ...picks };
    delete next[kind];
    setPicks(next);
  }

  // 기록은 이미 저장됐다. 사진 실패는 던지지 않고 알리기만 한다 (던지면 폼이 저장 화면에 멈추고, 다시 누르면 기록이 두 개 생긴다)
  async function handleCreated(entry: RecordEntry) {
    const list: PickedPhoto[] = kinds.flatMap((kind) => {
      const picked = picks[kind];
      return picked ? [{ kind, file: picked.file }] : [];
    });
    if (list.length === 0) return;
    // 오프라인이면 보내기를 시도하지 않는다: 요청이 시간 초과(15초)까지 저장 버튼을 붙잡을 수 있다
    if (!isOnline) {
      const notice = newRecordPhotoNotice({ status: 'notOnServer' });
      if (notice) showToast(notice);
      return;
    }
    setIsAttaching(true);
    try {
      const notice = newRecordPhotoNotice(
        await attachNewRecordPhotos(entry.id, list),
      );
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
      section={
        <NewRecordPhotos
          kinds={kinds}
          picks={picks}
          onPick={pick}
          onRemove={remove}
          onError={setError}
          isOnline={isOnline}
          isDisabled={isAttaching}
          error={error}
        />
      }
      onCreated={handleCreated}
    />
  );
}
