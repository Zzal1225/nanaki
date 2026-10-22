'use client';

// 'use client' 이유: 체크 버튼이 저장 요청(useMutation)을 보낸다
import { Check, Minus, Plus } from 'lucide-react';
import { useSetRoutineCheck } from '@/features/records/hooks/useSetRoutineCheck';
import { MAX_ROUTINE_CHECK_COUNT } from '@/features/records/schema/routineCheck';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { unitOf, type DayRoutine } from '../progress';

type RoutineChecklistProps = {
  date: string;
  items: DayRoutine[];
  // 미래 날짜는 체크할 수 없다 (아직 일어나지 않은 일을 기록하지 않는다). 목록은 보여 주되 버튼을 막는다
  isLocked: boolean;
};

// 44px 터치 영역 (CLAUDE.md: 모든 구간)
const TOUCH_TARGET = 'size-11';

// 그날 해야 할 루틴의 체크 목록 (홈 하루 요약의 루틴 줄, 루틴 상세의 "오늘").
// 체크형은 한 번 누르면 완료·다시 누르면 해제, 횟수형은 − / + 로 "5/8잔". 0이 되면 기록을 지운다 (recordStore.setRoutineCheck)
export default function RoutineChecklist({
  date,
  items,
  isLocked,
}: RoutineChecklistProps) {
  const setCheck = useSetRoutineCheck();
  // 저장 중인 루틴만 막는다: 다른 루틴은 이어서 누를 수 있게
  const pendingId = setCheck.isPending
    ? setCheck.variables?.routineId
    : undefined;

  function save(item: DayRoutine, count: number) {
    setCheck.mutate({
      routineId: item.routine.id,
      routineName: item.routine.name,
      date,
      count,
      target: item.target,
      unit: unitOf(item.routine),
    });
  }

  return (
    <div className='flex flex-col'>
      <ul>
        {items.map((item) => {
          const isBusy = isLocked || pendingId === item.routine.id;
          const name = item.routine.name;
          return (
            <li
              key={item.routine.id}
              className='flex min-h-11 items-center gap-2 border-t border-border first:border-t-0'
            >
              <span
                className={`min-w-0 flex-1 truncate text-body-sm ${
                  item.isDone
                    ? 'text-fg-secondary line-through'
                    : 'text-fg-primary'
                }`}
              >
                {name}
              </span>
              {item.target === 1 ? (
                // 체크형: 체크박스 역할의 버튼 (aria-checked로 상태를 읽어 준다)
                <button
                  type='button'
                  role='checkbox'
                  aria-checked={item.isDone}
                  aria-label={`${name} 완료`}
                  disabled={isBusy}
                  onClick={() => save(item, item.isDone ? 0 : 1)}
                  className={`flex ${TOUCH_TARGET} shrink-0 items-center justify-center disabled:opacity-50`}
                >
                  <span
                    className={`flex size-6 items-center justify-center rounded-sm border ${
                      item.isDone
                        ? 'border-type-routine bg-type-routine text-surface'
                        : 'border-border bg-surface'
                    }`}
                  >
                    {item.isDone && (
                      <Check
                        aria-hidden='true'
                        size={ICON_SIZE.sm}
                        strokeWidth={ICON_STROKE_WIDTH}
                      />
                    )}
                  </span>
                </button>
              ) : (
                // 횟수형: − 횟수/목표 +. 목표를 넘겨도 더할 수 있다 (8잔 목표에 10잔 마신 날)
                <span className='flex shrink-0 items-center'>
                  <button
                    type='button'
                    aria-label={`${name} 한 번 빼기`}
                    disabled={isBusy || item.count === 0}
                    onClick={() => save(item, item.count - 1)}
                    className={`flex ${TOUCH_TARGET} items-center justify-center rounded-md text-fg-primary hover:bg-surface-hover disabled:text-fg-disabled`}
                  >
                    <Minus
                      aria-hidden='true'
                      size={ICON_SIZE.sm}
                      strokeWidth={ICON_STROKE_WIDTH}
                    />
                  </button>
                  <span
                    // 바뀐 횟수를 화면 읽기 프로그램이 바로 읽어 준다
                    aria-live='polite'
                    className='min-w-14 text-center text-body-sm font-semibold tabular-nums'
                  >
                    {item.count}/{item.target}
                    {unitOf(item.routine)}
                  </span>
                  <button
                    type='button'
                    aria-label={`${name} 한 번 더하기`}
                    disabled={isBusy || item.count >= MAX_ROUTINE_CHECK_COUNT}
                    onClick={() => save(item, item.count + 1)}
                    className={`flex ${TOUCH_TARGET} items-center justify-center rounded-md text-fg-primary hover:bg-surface-hover disabled:text-fg-disabled`}
                  >
                    <Plus
                      aria-hidden='true'
                      size={ICON_SIZE.sm}
                      strokeWidth={ICON_STROKE_WIDTH}
                    />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {setCheck.isError && (
        <p role='alert' className='py-1 text-caption text-danger'>
          저장하지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}
      {isLocked && (
        <p className='py-1 text-caption text-fg-secondary'>
          아직 오지 않은 날은 체크할 수 없어요
        </p>
      )}
    </div>
  );
}
