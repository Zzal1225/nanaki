'use client';

// 'use client' 이유: 오늘(남은 날 계산)과 연결 상태는 브라우저에서만 안다
import { ChevronLeft, CloudOff } from 'lucide-react';
import Link from 'next/link';
import { useToday } from '@/shared/date/useToday';
import { useOnlineStatus } from '@/shared/network/useOnlineStatus';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import FixedExpenseSection from './FixedExpenseSection';

// 고정지출 화면 (/fixed-expenses). 가계부 화면 요약 카드의 "고정지출 N개 ›"에서 들어온다 (2026-10-23 사용자 결정:
// 예산 설정과 고정지출을 나눈다). 보기·수정·해지만 하고, 만들기는 가계부 쓰기의 "고정지출" 체크에서.
// 고정지출은 달마다 다른 값이 아니라 지금의 규칙이라 달 이동이 없다
export default function FixedExpensesScreen() {
  const today = useToday();
  const isOnline = useOnlineStatus();

  return (
    <div className='mx-auto flex w-full max-w-xl flex-col pb-6'>
      {/* 예산·타입 화면과 같은 머리 줄: 스크롤해도 뒤로가 위에 붙어 있다 */}
      <div className='sticky top-0 z-20 flex h-14 items-center gap-1 bg-bg px-1 md:px-3 lg:mt-4'>
        <Link
          href='/records/type/expense'
          aria-label='가계부 화면으로 돌아가기'
          className='inline-flex size-11 items-center justify-center rounded-md text-fg-primary hover:bg-surface-hover active:bg-surface-pressed'
        >
          <ChevronLeft
            aria-hidden='true'
            size={ICON_SIZE.lg}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </Link>
        <h1 className='ml-1 text-title text-fg-primary'>고정지출</h1>
      </div>

      <div className='mx-4 mt-2 flex flex-col gap-4 md:mx-6'>
        {/* 바꾸기는 온라인 전용(fixedExpenseStore). 보기는 기기 사본으로 된다 */}
        {!isOnline && (
          <p className='flex items-start gap-2 rounded-md bg-surface-hover px-3 py-2 text-body-sm text-fg-primary'>
            <CloudOff
              aria-hidden='true'
              size={ICON_SIZE.sm}
              strokeWidth={ICON_STROKE_WIDTH}
              className='mt-0.5 shrink-0 text-fg-secondary'
            />
            오프라인이에요. 연결되면 고정지출을 바꿀 수 있어요.
          </p>
        )}
        {today ? (
          <FixedExpenseSection today={today} canEdit={isOnline} />
        ) : (
          <div
            aria-busy='true'
            className='h-40 animate-pulse rounded-lg bg-surface-hover'
          />
        )}
      </div>
    </div>
  );
}
