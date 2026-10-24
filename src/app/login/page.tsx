import type { Metadata, Viewport } from 'next';
import { Info } from 'lucide-react';
import { GUEST_RETENTION_DAYS } from '@/features/auth/guestRetention';
import LoginAvatar from '@/features/auth/login/LoginAvatar';
import LoginPhrase from '@/features/auth/login/LoginPhrase';
import '@/features/auth/login/loginScreen.css';
import SignInButtons from '@/features/auth/SignInButtons';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';

export const metadata: Metadata = {
  title: '로그인',
};

// 이 화면만 브라우저 위 막대·상태 표시줄을 초록으로 (테마와 상관없이 고정, tokens.json exceptions.login-screen).
// 다른 화면처럼 회색 바탕색이면 초록 화면 위에 회색 띠가 생긴다
export const viewport: Viewport = {
  themeColor: '#2e7d4f',
};

// 로그인 첫 화면 (Issue #9, design/nanaki-login-handoff 2026-10-24 사용자 시안).
// 등장 순서: 아바타 → nanaki → "나는 나를 키운다"가 "나나키"로 접힘 → 슬로건 → 버튼(3.5초). 움직임은 모두 CSS(loginScreen.css)라
// 서버 컴포넌트 그대로다(자바스크립트로 시간을 재지 않는다). 동작 줄이기 설정이면 마지막 모습을 바로 보여 준다.
// 로그인한 사람은 이 화면에 오지 않는다(proxy가 홈으로 보낸다) → 3.5초를 기다리는 것은 처음 시작하는 사람뿐이다
export default function LoginPage() {
  return (
    <main className='login-screen' data-login-screen>
      <h1 className='login-wordmark'>nanaki</h1>
      <LoginAvatar />
      <LoginPhrase />
      <p className='login-slogan'>오늘의 나를 돌보는 가장 작은 습관</p>

      <section aria-label='시작하기' className='login-actions'>
        <SignInButtons />
        <p className='login-note'>
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
