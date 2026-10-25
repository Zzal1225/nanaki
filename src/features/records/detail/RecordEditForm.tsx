'use client';

// 'use client' 이유: 고칠 기록을 브라우저에서 불러온 뒤 폼에 넣는다
import { recordViewHref } from '../routes/recordRoutes';
import Link from 'next/link';
import RecordForm from '../form/RecordForm';
import { useRecordPhotos } from '@/features/photos/hooks/usePhotos';
import { useOnlineStatus } from '@/shared/network/useOnlineStatus';
import type { RecordEntry } from '../schema/recordEntry';
import { getPhotoKinds, isEditableType } from '../schema/recordTypes';
import { usePendingRecordIds } from '../hooks/usePendingRecordIds';
import { useRecord } from '../hooks/useRecord';

type RecordEditFormProps = {
  id: string;
  // 상세가 들고 온 "들어온 곳" 조건. 저장·닫기 뒤 상세로 돌아갈 때 그대로 붙인다 (detailOrigin)
  originQuery?: string;
};

// 기록을 불러온 다음에 폼을 그린다. 폼의 처음 값(defaultValues)은 처음 그릴 때 한 번만 읽혀서,
// 불러오기 전에 빈 폼을 먼저 그리면 나중에 값이 와도 칸이 채워지지 않는다
export default function RecordEditForm({
  id,
  originQuery = '',
}: RecordEditFormProps) {
  const { data: entry, isPending, isError } = useRecord(id);

  if (isPending) {
    return (
      <div
        aria-busy='true'
        className='mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6 md:px-6'
      >
        <div className='h-12 animate-pulse rounded-md bg-surface-hover' />
        <div className='h-12 animate-pulse rounded-md bg-surface-hover' />
        <div className='h-12 animate-pulse rounded-md bg-surface-hover' />
      </div>
    );
  }

  if (isError || !entry) {
    return (
      <div
        role='alert'
        className='flex flex-col items-start gap-3 px-4 py-6 md:px-6'
      >
        <p className='text-body text-fg-primary'>
          {isError ? '기록을 불러오지 못했어요.' : '기록을 찾을 수 없어요.'}
        </p>
        <Link
          href='/records'
          className='text-body-sm font-semibold text-accent underline underline-offset-4'
        >
          기록 탭으로
        </Link>
      </div>
    );
  }

  // 폼으로 고치지 않는 기록(루틴 체크): 수정 버튼은 없지만 주소를 직접 친 경우를 위해 안내한다
  if (!isEditableType(entry.type)) {
    return (
      <div className='flex flex-col items-start gap-3 px-4 py-6 md:px-6'>
        <p className='text-body text-fg-primary'>
          루틴 체크는 홈이나 루틴 화면에서 바꿀 수 있어요.
        </p>
        <Link
          href={recordViewHref(entry.id, originQuery)}
          className='text-body-sm font-semibold text-accent underline underline-offset-4'
        >
          기록으로 돌아가기
        </Link>
      </div>
    );
  }

  const doneHref = recordViewHref(entry.id, originQuery);
  if (getPhotoKinds(entry.type).length > 0) {
    return <EditFormWithPhotoCount entry={entry} doneHref={doneHref} />;
  }
  return <RecordForm mode='edit' entry={entry} doneHref={doneHref} />;
}

// 사진 칸이 있는 타입(체형)을 고칠 때: 이미 붙은 사진 장수를 폼 검사에 넘긴다.
// 사진만 있는 기록은 숫자를 비운 채로도 저장되고, 사진이 없는 기록은 숫자를 다 지우면 막힌다 (체중·허리둘레·사진 중 1개 이상).
// 사진을 모를 때(오프라인·아직 서버에 없는 기록·불러오는 중)는 0장으로 본다: 빈 기록이 생기는 쪽보다 막는 쪽이 안전하다
function EditFormWithPhotoCount({
  entry,
  doneHref,
}: {
  entry: RecordEntry;
  doneHref: string;
}) {
  const isOnline = useOnlineStatus();
  const isOnServer = !usePendingRecordIds().has(entry.id);
  const photos = useRecordPhotos(entry.id, isOnline && isOnServer);
  return (
    <RecordForm
      mode='edit'
      entry={entry}
      doneHref={doneHref}
      photoKinds={photos.data?.map((photo) => photo.kind) ?? []}
    />
  );
}
