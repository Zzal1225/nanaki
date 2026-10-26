'use client';

// 'use client' 이유: 입력 상태(React Hook Form), 저장 요청, 화면 이동이 모두 브라우저에서 일어난다
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { isPushConfigured } from '@/features/push/api/pushStore';
import { usePushSupport } from '@/features/push/hooks/usePushSupport';
import { useThisDevicePush } from '@/features/push/hooks/useThisDevicePush';
import { pushSetupMessage } from '@/features/push/pushMessages';
import { useToastStore } from '@/shared/toast/toastStore';
import { useOnlineStatus } from '@/shared/network/useOnlineStatus';
import Button from '@/shared/ui/Button';
import DateField from '@/shared/ui/DateField';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import TextField from '@/shared/ui/TextField';
import { useCreateRoutine, useUpdateRoutine } from '../hooks/useRoutines';
import {
  DEFAULT_REMIND_AT,
  MAX_ROUTINE_NAME_LENGTH,
  type Routine,
  type RoutineFormValues,
} from '../schema/routine';
import GoalInput from './GoalInput';
import RemindInput from './RemindInput';
import {
  goalToDraft,
  routineDraftSchema,
  scheduleToDraft,
  type RoutineDraftInput,
} from './routineDraft';
import ScheduleInput from './ScheduleInput';

// 만들기와 고치기가 같은 폼을 쓴다 (기록의 RecordForm과 같은 이유: 두 화면의 칸·검증이 어긋나지 않게).
// 그만두기는 폼이 아니라 고치기 화면의 따로 된 동작이다 (RoutineEditForm)
type RoutineFormProps =
  // today: 새 루틴의 시작일 기본값. 폼 안에서 new Date()를 부르지 않고 받는다 (NewRoutineForm 참고)
  | { mode: 'create'; today: string; doneHref: string }
  | { mode: 'edit'; routine: Routine; doneHref: string };

function toDefaultValues(props: RoutineFormProps): RoutineDraftInput {
  if (props.mode === 'edit') {
    const { routine } = props;
    return {
      name: routine.name,
      startDate: routine.startDate,
      schedule: scheduleToDraft(routine.schedule, routine.startDate),
      goal: goalToDraft(routine.goal),
      remindAt: routine.remindAt,
    };
  }
  const { today } = props;
  return {
    name: '',
    startDate: today,
    schedule: scheduleToDraft(undefined, today),
    goal: goalToDraft(undefined),
    // 알림은 켜진 채 시작 (2026-10-25 사용자 결정, 아이폰 확인 4). 권한은 저장을 누를 때 묻는다 (onSubmit).
    // 푸시를 쓸 수 없는 배포에서는 알림 칸이 숨어 있어 끌 수도 없으니 꺼 둔다
    remindAt: isPushConfigured() ? DEFAULT_REMIND_AT : null,
  };
}

// 중첩된 칸(schedule.days, goal.target)의 오류는 객체 안에 들어 있다. 칸 묶음 아래에 첫 문구 하나만 보여 준다
function firstErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  if ('message' in error && typeof error.message === 'string')
    return error.message;
  for (const child of Object.values(error)) {
    const message = firstErrorMessage(child);
    if (message) return message;
  }
  return undefined;
}

export default function RoutineForm(props: RoutineFormProps) {
  const isEdit = props.mode === 'edit';
  const form = useForm<RoutineDraftInput, unknown, RoutineFormValues>({
    resolver: zodResolver(routineDraftSchema),
    defaultValues: toDefaultValues(props),
  });
  const createRoutine = useCreateRoutine();
  const updateRoutine = useUpdateRoutine();
  const saving = isEdit ? updateRoutine : createRoutine;
  const isOnline = useOnlineStatus();
  const router = useRouter();
  const push = useThisDevicePush();
  const pushSupport = usePushSupport();
  const showToast = useToastStore((state) => state.showToast);

  async function onSubmit(values: RoutineFormValues) {
    // 알림이 켜졌는데 이 기기가 아직 받지 않으면 저장을 누른 지금 권한을 묻는다: 아이폰은 누른 직후가 아니면 묻는 창을 무시해서
    // 저장 요청을 기다린 뒤에 물으면 늦는다 → 맨 먼저 시작하고 저장과 함께 진행한다.
    // 이 기기에서 받을 수 없으면(아이폰 Safari 탭·차단) 묻지 않는다: 이유는 알림 칸에 이미 보이고, 시각은 저장해 다른 기기로 보낸다
    const pushSetup =
      values.remindAt !== null &&
      pushSupport === 'supported' &&
      !push.isSubscribed
        ? push.subscribe()
        : null;
    try {
      if (props.mode === 'edit') {
        await updateRoutine.mutateAsync({ id: props.routine.id, values });
      } else {
        await createRoutine.mutateAsync(values);
      }
      // replace: 뒤로 가기로 방금 저장한 폼에 돌아와 같은 루틴을 또 만들지 않게
      router.replace(props.doneHref);
      // 권한 창·구독은 기다리지 않고 화면을 옮긴다. 못 켰으면 옮긴 화면에서 토스트로 알린다 (토스트는 화면 밖 저장소라 남는다)
      void pushSetup?.then((result) => {
        const message = pushSetupMessage(result);
        if (message) showToast({ message, tone: 'error' });
      });
    } catch {
      // 오류 문구는 아래 saving.error로 보여 준다
    }
  }

  const { errors } = form.formState;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className='mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-4 md:px-6'
    >
      {/* 스크롤해도 머리 줄(뒤로·닫기)이 맨 위에 붙어 있다 (2026-10-22 사용자 요청: 긴 화면에서 뒤로 가려고 다시 올라가기 불편). bg-bg: 밑으로 지나가는 내용이 비치지 않게, z-20: 떠 있는 + 버튼·메뉴(z-40) 아래 */}
      <div className='sticky top-0 z-20 -mx-4 flex h-14 items-center bg-bg px-1 md:-mx-6 md:px-3'>
        <Link
          href={props.doneHref}
          replace
          aria-label='닫기'
          className='inline-flex size-11 items-center justify-center rounded-md text-fg-primary hover:bg-surface-hover active:bg-surface-pressed'
        >
          <X
            aria-hidden='true'
            size={ICON_SIZE.lg}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </Link>
        <h1 className='flex-1 text-center text-body font-semibold text-fg-primary'>
          {isEdit ? '루틴 수정' : '루틴 만들기'}
        </h1>
        <span aria-hidden='true' className='size-11' />
      </div>

      {/* 시안: 공통 필드 순서를 지켜 날짜 자리는 "시작일", 제목 자리는 "이름" */}
      <Controller
        control={form.control}
        name='startDate'
        render={({ field: input, fieldState }) => (
          <DateField
            label='시작일'
            value={input.value}
            onChange={input.onChange}
            onBlur={input.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />

      <TextField
        label='이름'
        placeholder='예: 물 마시기'
        maxLength={MAX_ROUTINE_NAME_LENGTH}
        error={errors.name?.message}
        {...form.register('name')}
      />

      <Controller
        control={form.control}
        name='schedule'
        render={({ field: input }) => (
          <ScheduleInput
            value={input.value}
            onChange={input.onChange}
            error={firstErrorMessage(errors.schedule)}
          />
        )}
      />

      <Controller
        control={form.control}
        name='goal'
        render={({ field: input }) => (
          <GoalInput
            value={input.value}
            onChange={input.onChange}
            error={firstErrorMessage(errors.goal)}
          />
        )}
      />

      {/* 알림 (35a): 이 배포에 푸시 공개 키가 있을 때만 보인다. 보내기(35b)가 없는 배포에서 켤 수 있는 척하지 않게 (CLAUDE.md: 미구현 기능은 숨김) */}
      {isPushConfigured() && (
        <Controller
          control={form.control}
          name='remindAt'
          render={({ field: input, fieldState }) => (
            <RemindInput
              value={input.value}
              onChange={input.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      )}

      {/* 기록 폼(RecordForm)과 같이 폼 끝 제자리에: 화면 아래에 붙어 따라오면 마지막 칸을 덮었다 (2026-10-25 아이폰 확인 10) */}
      <div className='flex flex-col gap-2 py-3'>
        {saving.error && (
          <p role='alert' className='text-caption text-danger'>
            저장하지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        )}
        {!isOnline && (
          // 루틴 만들기·수정은 온라인 전용 (2026-10-22 사용자 결정): 규칙은 드물게 바꾸고, 오프라인 충돌을 따질 만큼 자주 쓰지 않는다
          <p className='text-caption text-fg-secondary'>
            연결되면 저장할 수 있어요
          </p>
        )}
        <Button type='submit' isLoading={saving.isPending} disabled={!isOnline}>
          저장
        </Button>
      </div>
    </form>
  );
}
