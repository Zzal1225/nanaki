import { Suspense } from 'react';
import HomeCalendar from '@/features/calendar/HomeCalendar';

// HomeCalendar는 useSearchParams(?date=)를 읽는다. cacheComponents에서는 요청 때만 아는 값이라
// Suspense 안에 둬야 바깥(앱 틀)을 미리 그려 둘 수 있다. 없으면 빌드가 실패한다
export default function HomePage() {
  return (
    <Suspense fallback={<p className='sr-only'>캘린더를 여는 중</p>}>
      <HomeCalendar />
    </Suspense>
  );
}
