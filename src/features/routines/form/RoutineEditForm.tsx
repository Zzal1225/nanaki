'use client';

// 'use client' 이유: 고칠 루틴을 브라우저에서 불러오고, 그만두기 확인 창을 연다
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatDisplayDate } from '@/shared/date/formatDisplayDate';
import { useToday } from '@/shared/date/useToday';
import { useOnlineStatus } from '@/shared/network/useOnlineStatus';
import Button from '@/shared/ui/Button';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import { useEndRoutine, useRoutine } from '../hooks/useRoutines';
import { toEndedOn } from '../schema/routine';
import RoutineForm from './RoutineForm';

type RoutineEditFormProps = {
  id: string;
  doneHref: string;
};

// 루틴 수정 + 그만두기.
// 루틴을 불러온 뒤에 폼을 그린다: 폼의 처음 값은 처음 그릴 때 한 번만 읽혀서(RecordEditForm과 같은 이유)
export default function RoutineEditForm({
  id,
  doneHref,
}: RoutineEditFormProps) {
  const { data: routine, isPending, isError } = useRoutine(id);
  const endRoutine = useEndRoutine();
  const isOnline = useOnlineStatus();
  const today = useToday();
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  if (isPending) {
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

  if (isError || !routine) {
    return (
      <div
        role='alert'
        className='flex flex-col items-start gap-3 px-4 py-6 md:px-6'
      >
        <p className='text-body text-fg-primary'>
          {isError ? '루틴을 불러오지 못했어요.' : '루틴을 찾을 수 없어요.'}
        </p>
        <Link
          href={doneHref}
          className='text-body-sm font-semibold text-accent underline underline-offset-4'
        >
          돌아가기
        </Link>
      </div>
    );
  }

  async function handleEnd() {
    if (!routine || !today) return;
    try {
      await endRoutine.mutateAsync({
        id: routine.id,
        endedOn: toEndedOn(routine, today),
      });
      setIsConfirmOpen(false);
      router.replace(doneHref);
    } catch {
      // 실패 문구는 아래 endRoutine.error로 보여 준다 (확인 창은 닫고)
      setIsConfirmOpen(false);
    }
  }

  return (
    <>
      <RoutineForm mode='edit' routine={routine} doneHref={doneHref} />
      <section
        aria-label='루틴 그만두기'
        className='mx-auto flex w-full max-w-xl flex-col gap-2 px-4 pb-8 md:px-6'
      >
        {routine.endedOn ? (
          <p className='text-body-sm text-fg-secondary'>
            {formatDisplayDate(routine.endedOn)}에 그만둔 루틴이에요
          </p>
        ) : (
          <>
            <Button
              variant='secondary'
              onClick={() => setIsConfirmOpen(true)}
              // 오늘을 읽기 전(첫 하이드레이션)에는 그만둔 날을 정할 수 없다. 그만두기도 온라인 전용
              disabled={!today || !isOnline}
            >
              이 루틴 그만두기
            </Button>
            {endRoutine.error && (
              <p role='alert' className='text-caption text-danger'>
                그만두지 못했어요. 잠시 후 다시 시도해 주세요.
              </p>
            )}
          </>
        )}
      </section>
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title='이 루틴을 그만둘까요?'
        description='오늘부터 할 일 목록에 나오지 않아요. 지금까지 체크한 기록은 그대로 남아요.'
        confirmLabel='그만두기'
        confirmVariant='danger'
        onConfirm={() => void handleEnd()}
        isPending={endRoutine.isPending}
      />
    </>
  );
}
