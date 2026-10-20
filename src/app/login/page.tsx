import type { Metadata } from 'next';
import { Info, Sprout } from 'lucide-react';
import GoogleSignInButton from '@/features/auth/GoogleSignInButton';
import Button from '@/shared/ui/Button';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';

export const metadata: Metadata = {
  title: '로그인 · nanaki',
};

// 로고 타일(112px) 안의 새싹 아이콘 크기. 일반 아이콘 규격(16·20·24)과 별개인 로고 전용 값
const LOGO_ICON_SIZE = 56;

export default function LoginPage() {
  return (
    // 모바일은 위에 소개, 아래에 버튼(엄지가 닿는 곳). PC에는 별도 시안이 없어 가운데로 모은다
    <main className='mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between px-6 pt-22 pb-12 md:justify-center md:gap-16'>
      <section className='flex flex-col items-center gap-2 px-2 text-center'>
        <div className='mb-6 flex size-28 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-float'>
          <Sprout
            aria-hidden='true'
            size={LOGO_ICON_SIZE}
            strokeWidth={ICON_STROKE_WIDTH}
          />
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
        <GoogleSignInButton />
        <Button variant='secondary' className='h-12 w-full'>
          로그인 없이 체험하기
        </Button>
        <p className='flex items-center justify-center gap-2 text-caption text-fg-secondary'>
          <Info
            aria-hidden='true'
            size={ICON_SIZE.sm}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          체험 데이터는 3일 뒤 자동으로 삭제돼요
        </p>
      </section>
    </main>
  );
}

// 앱 이름의 뜻(나·나·키)을 강조하는 글자
function Accent({ children }: { children: string }) {
  return <strong className='font-bold text-accent'>{children}</strong>;
}
