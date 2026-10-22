'use client';

// 'use client' 이유: 오늘 날짜(시작일 기본값)를 브라우저에서 읽는다
import { useToday } from '@/shared/date/useToday';
import RoutineForm from './RoutineForm';

type NewRoutineFormProps = {
  doneHref: string;
};

// 루틴 만들기 화면은 주소 값 없이 미리 그려 둘 수 있는 페이지라, cacheComponents가 빌드 때 미리 그린다(prerender).
// 그때 폼 기본값에서 new Date()를 부르면 "빌드한 날"이 박히므로 Next.js가 빌드를 멈춘다 (build에서만 드러남).
// 그래서 오늘은 브라우저에서 useToday로 읽고, 읽기 전에는 자리만 보여 준다
export default function NewRoutineForm({ doneHref }: NewRoutineFormProps) {
  const today = useToday();

  if (!today) {
    return (
      <div
        aria-busy='true'
        className='mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6 md:px-6'
      >
        <div className='h-12 animate-pulse rounded-md bg-surface-hover' />
        <div className='h-12 animate-pulse rounded-md bg-surface-hover' />
        <div className='h-24 animate-pulse rounded-md bg-surface-hover' />
      </div>
    );
  }

  return <RoutineForm mode='create' today={today} doneHref={doneHref} />;
}
