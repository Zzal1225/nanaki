import type { Metadata } from 'next';
import { Info } from 'lucide-react';
import { GUEST_RETENTION_DAYS } from '@/features/auth/guestRetention';
import SignInButtons from '@/features/auth/SignInButtons';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import NakiAvatar from '@/shared/ui/NakiAvatar';

export const metadata: Metadata = {
  title: '로그인',
};

// 로고(나키 아바타) 크기. 예전 새싹 타일(size-28 = 112px)과 같은 자리를 그대로 차지한다
const LOGO_SIZE = 112;

export default function LoginPage() {
  return (
    // 모바일은 위에 소개, 아래에 버튼(엄지가 닿는 곳). PC에는 별도 시안이 없어 가운데로 모은다
    <main className='mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between px-6 pt-22 pb-12 md:justify-center md:gap-16'>
      <section className='flex flex-col items-center gap-2 px-2 text-center'>
        {/* 앱 로고 = 나키 아바타 (2026-10-23 사용자 결정: 아이콘은 모두 아바타로). 그림자는 원 모양 감싸개에 */}
        <div className='mb-6 rounded-full shadow-float'>
          <NakiAvatar size={LOGO_SIZE} isAboveFold />
        </div>
        <h1 className='text-display text-fg-primary'>nanaki</h1>
        <p className='text-title font-medium text-fg-secondary'>
          <Accent>나</Accent>는 <Accent>나</Accent>를 <Accent>키</Accent>운다
        </p>
        <p className='mt-1 text-body text-pretty text-fg-secondary'>
          가계부부터 체형까지, 매일의 기록을 캘린더 하나에 모아요
        </p>
      </section>

      <section aria-label='시작하기' className='flex flex-col gap-3'>
        <SignInButtons />
        <p className='flex items-center justify-center gap-2 text-caption text-fg-secondary'>
          <Info
            aria-hidden='true'
            size={ICON_SIZE.sm}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          체험 기록은 {GUEST_RETENTION_DAYS}일 뒤 삭제되고, 이 기기에서만 보여요
        </p>
      </section>
    </main>
  );
}

// 앱 이름의 뜻(나·나·키)을 강조하는 글자
function Accent({ children }: { children: string }) {
  return <strong className='font-bold text-accent'>{children}</strong>;
}
