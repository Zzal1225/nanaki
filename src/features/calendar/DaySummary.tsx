'use client';

// 'use client' 이유: 타입 줄의 펼침 상태(useState)를 들고 있다
import { useState } from 'react';
import {
  getDayLabel,
  getDayValue,
  getListTitle,
  getListValue,
} from '@/features/records/ui/recordPresentation';
import type { RecordType } from '@/features/records/schema/recordTypes';
import { formatDayHeading } from '@/shared/date/formatDisplayDate';
import Button from '@/shared/ui/Button';
import DayEmptyState from './DayEmptyState';
import DayTypeRow from './DayTypeRow';
import type { DayTypeGroup } from './dayRecords';
import RoutineChecklist from '@/features/routines/check/RoutineChecklist';
import type { DayRoutine } from '@/features/routines/progress';

type DaySummaryProps = {
  date: string;
  isToday: boolean;
  // 불러오는 중이면 null
  groups: DayTypeGroup[] | null;
  // 그날 해야 할 루틴 (기록이 아니라 루틴 규칙에서 나온다). 루틴을 숨겼거나 그날 일정이 없으면 빈 배열
  routines: DayRoutine[];
  // 미래 날짜: 루틴 목록은 보여 주되 체크는 막는다
  isFuture: boolean;
  isError: boolean;
  onRetry: () => void;
  // 아직 서버에 보내지 않은 기록 id (펼친 목록의 "저장 대기")
  pendingIds: ReadonlySet<string>;
};

// 고른 날의 요약 (시안: 캘린더 아래, PC는 오른쪽 400px).
// 부모가 key={date}로 그려서 날짜가 바뀌면 이 컴포넌트가 새로 만들어지고 펼친 줄도 모두 접힌다.
// effect로 "날짜가 바뀌면 접기"를 하면 한 번 펼친 채로 그렸다가 다시 그려 깜빡인다
export default function DaySummary({
  date,
  isToday,
  groups,
  routines,
  isFuture,
  isError,
  onRetry,
  pendingIds,
}: DaySummaryProps) {
  const [openTypes, setOpenTypes] = useState<ReadonlySet<RecordType>>(
    () => new Set(),
  );

  function toggle(type: RecordType) {
    setOpenTypes((previous) => {
      const next = new Set(previous);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  return (
    <section
      aria-labelledby='day-summary-title'
      className='flex flex-col gap-2'
    >
      {/* 날짜를 옮기는 버튼은 두지 않는다: 날짜는 위 캘린더 칸을 눌러서(키보드는 방향키로) 고른다.
          머리에 기간 이동(‹ ›)이 이미 있어서, 여기에도 ‹ ›를 두면 같은 모양 버튼이 두 벌이라 무엇이 움직이는지 헷갈린다 */}
      <div className='flex min-h-11 items-center gap-2'>
        <h2
          id='day-summary-title'
          className='text-body font-bold text-fg-primary tabular-nums lg:text-title'
        >
          {formatDayHeading(date)}
        </h2>
        {isToday && (
          <span className='inline-flex h-6 items-center rounded-full bg-accent px-2 text-caption font-semibold text-accent-foreground'>
            오늘
          </span>
        )}
      </div>

      {isError ? (
        <div role='alert' className='flex flex-col items-start gap-3 py-2'>
          <p className='text-body text-fg-primary'>
            기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
          <Button variant='secondary' onClick={onRetry}>
            다시 시도
          </Button>
        </div>
      ) : !groups ? (
        <div
          aria-busy='true'
          className='h-26 animate-pulse rounded-lg bg-surface-hover'
        />
      ) : groups.length === 0 && routines.length === 0 ? (
        <DayEmptyState date={date} isToday={isToday} />
      ) : (
        <ul className='overflow-hidden rounded-lg bg-surface shadow-card'>
          {groups.map(({ type, entries }) => (
            <DayTypeRow
              key={type}
              type={type}
              label={getDayLabel(type, entries)}
              value={getDayValue(type, entries)}
              items={entries.map((entry) => ({
                id: entry.id,
                title: getListTitle(entry),
                value: getListValue(entry),
                isPending: pendingIds.has(entry.id),
              }))}
              isOpen={openTypes.has(type)}
              onToggle={() => toggle(type)}
            />
          ))}
          {/* 루틴 줄은 기록이 아니라 그날 일정으로: 체크가 하나도 없는 날에도 "오늘 할 루틴"이 보인다.
              스피드 다이얼 순서처럼 마지막 줄 (RECORD_TYPE_ORDER의 끝) */}
          {routines.length > 0 && (
            <DayTypeRow
              type='routine'
              label='루틴'
              value={`${routines.filter((item) => item.isDone).length}/${routines.length}`}
              items={[]}
              content={
                <RoutineChecklist
                  date={date}
                  items={routines}
                  isLocked={isFuture}
                />
              }
              isOpen={openTypes.has('routine')}
              onToggle={() => toggle('routine')}
            />
          )}
        </ul>
      )}
    </section>
  );
}
