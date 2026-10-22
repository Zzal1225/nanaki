'use client';

// 'use client' 이유: 타입(?type=)과 날짜(?date=)를 주소에서 브라우저가 읽는다.
// 서버가 읽으면 타입마다 다른 HTML이 되어, 서비스 워커가 저장해 둔 작성 화면 한 장으로 다른 타입을 열 수 없다 (오프라인 작성)
import { useSearchParams } from 'next/navigation';
import { toCalendarHref } from '@/features/calendar/calendarState';
import { isDateString } from '@/shared/date/calendar';
import { useReplaceRoute } from '@/shared/navigation/useReplaceRoute';
import RecordForm from '../form/RecordForm';
import { getCreateHref, parseRecordType } from '../schema/recordTypes';

// 주소(?type=expense)는 누구나 고쳐 칠 수 있어서, 모르는 타입이면 폼을 그리지 않고 홈으로 보낸다.
// 폼으로 쓰지 않는 타입(루틴 체크)은 그 타입의 만들기 화면으로 (?type=routine을 직접 친 경우).
// 옮기는 일은 redirect()가 아니라 useReplaceRoute로: 떠난 뒤 숨어 있는 이 화면이 홈 주소(type 없음)로 다시 그려질 때
// redirect()를 던지면, 다음에 작성 화면을 열 때 홈으로 튕겼다 (useReplaceRoute 설명)
// ?date=는 홈에서 고른 날. 틀린 날짜면 무시하고 폼 기본값(오늘)을 쓴다
export default function NewRecordFromUrl() {
  const params = useSearchParams();
  const type = parseRecordType(params.get('type'));
  const date = params.get('date');
  const moveTo = type ? getCreateHref(type) : '/';
  useReplaceRoute(moveTo ?? null);
  if (!type || moveTo) return null;

  // key: 타입이 바뀌면(작성 중 메뉴에서 다른 타입) 폼을 새로 만든다. 처음 값은 처음 그릴 때만 읽힌다
  return isDateString(date) ? (
    <RecordForm
      key={`${type}-${date}`}
      mode='create'
      type={type}
      date={date}
      doneHref={toCalendarHref(date)}
    />
  ) : (
    <RecordForm key={type} mode='create' type={type} />
  );
}
