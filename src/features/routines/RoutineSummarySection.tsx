'use client';

// 'use client' 이유: 루틴 규칙과 오늘 날짜를 브라우저에서 읽고, 오늘 체크 버튼이 저장 요청을 보낸다
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { RecordEntryOf } from '@/features/records/schema/recordEntry';
import { formatDisplayDate } from '@/shared/date/formatDisplayDate';
import { toMonthString } from '@/shared/date/month';
import { getSamePeriod } from '@/shared/date/samePeriod';
import { useToday } from '@/shared/date/useToday';
import { formatSchedule } from '@/shared/schedule/schedule';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import RoutineChecklist from './check/RoutineChecklist';
import { useRoutines } from './hooks/useRoutines';
import { getDayRoutines, getPerfectDays } from './progress';
import { isPushConfigured } from '@/features/push/api/pushStore';
import { formatGoal, formatRemindTime } from './schema/routine';

type RoutineSummarySectionProps = {
  // 이 달의 루틴 체크 기록 (타입 상세가 이미 불러온 것)
  entries: RecordEntryOf<'routine'>[];
  monthLabel: string;
  month: string;
};

// 루틴 상세 요약 (시안 13d "오늘 체크 + 달성률"):
// - 이 달 달성률: 1일~오늘(지난 달이면 그 달 전체) 중 해야 했던 날 대비 목표를 채운 비율
// - 오늘 할 루틴 체크 (이번 달을 볼 때만: 오늘 체크는 이번 달 기록 안에 있다)
// - 내 루틴 목록 (루틴을 고치거나 그만두는 곳은 여기서만 들어간다).
//   만들기 버튼은 두지 않는다 (2026-10-22 사용자 결정): 만들기는 다른 기록처럼 + 버튼(PC는 사이드바 "새 기록")의 "루틴 만들기" 한 곳에서
export default function RoutineSummarySection({
  entries,
  monthLabel,
  month,
}: RoutineSummarySectionProps) {
  const today = useToday();
  const routines = useRoutines();
  const all = routines.data ?? [];

  const period = today ? getSamePeriod(month, today) : null;
  // 루틴을 모두 해낸 날 (2026-10-25 사용자 결정: % 대신 날짜). 해야 할 날이 없으면 null → —
  const days = period ? getPerfectDays(all, entries, period.current) : null;
  const hasDays = days !== null && days.scheduledDays > 0;
  const isCurrentMonth = today !== null && toMonthString(today) === month;
  const todayItems =
    today && isCurrentMonth ? getDayRoutines(all, entries, today) : [];
  // 진행 중인 루틴 먼저, 그만둔 루틴은 아래에 흐리게 (지난 체크가 남아 있어 목록에서 지우지 않는다)
  const sorted = [...all].sort(
    (a, b) => Number(a.endedOn !== null) - Number(b.endedOn !== null),
  );

  return (
    <>
      <div className='flex flex-col gap-1'>
        <span className='text-body-sm text-fg-secondary'>
          {monthLabel} 루틴을 모두 해낸 날
        </span>
        <span className='text-[28px] leading-[34px] font-bold text-fg-primary tabular-nums'>
          {hasDays ? `${days.perfectDays}일` : '—'}
        </span>
        {hasDays && (
          <span className='text-caption text-fg-secondary tabular-nums'>
            {`루틴이 있던 ${days.scheduledDays}일 중`}
          </span>
        )}
      </div>

      {todayItems.length > 0 && today && (
        <div className='flex flex-col gap-1 border-t border-border pt-4'>
          <h2 className='text-body-sm font-semibold text-fg-primary'>
            오늘{' '}
            <span className='text-fg-secondary tabular-nums'>
              {todayItems.filter((item) => item.isDone).length}/
              {todayItems.length}
            </span>
          </h2>
          <RoutineChecklist date={today} items={todayItems} isLocked={false} />
        </div>
      )}

      <div className='flex flex-col gap-1 border-t border-border pt-4'>
        <h2 className='text-body-sm font-semibold text-fg-primary'>내 루틴</h2>
        {routines.isError ? (
          <p role='alert' className='py-2 text-body-sm text-fg-secondary'>
            루틴을 불러오지 못했어요.
          </p>
        ) : routines.isSuccess && sorted.length === 0 ? (
          // 버튼이 없어서 어디서 만드는지 알려 준다. + 모양은 모바일 스피드 다이얼과 PC 사이드바 "새 기록"에 모두 보인다
          <p className='py-2 text-body-sm text-fg-secondary'>
            아직 만든 루틴이 없어요. + 버튼의 &quot;루틴 만들기&quot;로 만들 수
            있어요.
          </p>
        ) : (
          <ul>
            {sorted.map((routine) => (
              <li
                key={routine.id}
                className='border-t border-border first:border-t-0'
              >
                <Link
                  href={`/routines/${routine.id}/edit`}
                  className='flex min-h-11 items-center gap-2 py-1 hover:bg-surface-hover'
                >
                  <span className='flex min-w-0 flex-1 flex-col'>
                    <span
                      className={`truncate text-body-sm ${
                        routine.endedOn
                          ? 'text-fg-secondary'
                          : 'text-fg-primary'
                      }`}
                    >
                      {routine.name}
                    </span>
                    <span className='truncate text-caption text-fg-secondary'>
                      {routine.endedOn
                        ? `${formatDisplayDate(routine.endedOn)}에 그만둠`
                        : `${formatSchedule(routine.schedule)} · ${formatGoal(routine.goal)}${
                            // 알림 시각 (35a). 푸시를 쓸 수 없는 배포에서는 보이지 않는다 (폼의 알림 칸과 같은 조건)
                            routine.remindAt && isPushConfigured()
                              ? ` · 알림 ${formatRemindTime(routine.remindAt)}`
                              : ''
                          }`}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden='true'
                    size={ICON_SIZE.sm}
                    strokeWidth={ICON_STROKE_WIDTH}
                    className='shrink-0 text-fg-secondary'
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
