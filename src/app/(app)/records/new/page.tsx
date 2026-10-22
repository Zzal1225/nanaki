import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { toCalendarHref } from '@/features/calendar/calendarState';
import RecordForm from '@/features/records/form/RecordForm';
import {
  getCreateHref,
  parseRecordType,
} from '@/features/records/schema/recordTypes';
import { isDateString } from '@/shared/date/calendar';

export const metadata: Metadata = {
  title: '새 기록',
};

// cacheComponents에서는 요청 때만 알 수 있는 값(searchParams)을 읽는 부분을 Suspense 안에 둬야 한다.
// 그래야 바깥(앱 틀)은 미리 그려 두고 바로 보여 줄 수 있다. 밖에서 await하면 빌드가 실패한다
export default function NewRecordPage({
  searchParams,
}: PageProps<'/records/new'>) {
  return (
    <Suspense fallback={<p className='sr-only'>작성 화면을 여는 중</p>}>
      <NewRecordContent searchParams={searchParams} />
    </Suspense>
  );
}

// 주소(?type=expense)는 누구나 고쳐 칠 수 있어서, 모르는 타입이면 폼을 그리지 않고 홈으로 보낸다.
// ?date=는 홈에서 고른 날. 틀린 날짜면 무시하고 폼 기본값(오늘)을 쓴다
async function NewRecordContent({
  searchParams,
}: Pick<PageProps<'/records/new'>, 'searchParams'>) {
  const { type, date } = await searchParams;
  const recordType = parseRecordType(type);
  if (!recordType) redirect('/');
  // 폼으로 쓰지 않는 타입(루틴 체크)은 그 타입의 만들기 화면으로 (?type=routine을 직접 친 경우)
  const createHref = getCreateHref(recordType);
  if (createHref) redirect(createHref);

  if (!isDateString(date))
    return <RecordForm mode='create' type={recordType} />;

  return (
    <RecordForm
      mode='create'
      type={recordType}
      date={date}
      doneHref={toCalendarHref(date)}
    />
  );
}
