'use client';

// 'use client' 이유: 데이터 요청이 끝났는지(TanStack Query)·시간·연결 상태를 브라우저에서 보고 스스로 사라진다
import { useIsFetching } from '@tanstack/react-query';
import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  clearSplashContinue,
  hasSplashContinue,
  remainingMaxMs,
  remainingMinMs,
  SPLASH_LEAVE_MS,
  SPLASH_SETTLE_MS,
  SPLASH_SKIP_ATTR,
} from './splashRules';
import LoginHero from './LoginHero';
import './loginScreen.css';

type Phase = 'shown' | 'leaving' | 'gone';

function subscribeNothing(): () => void {
  return () => {};
}

function isSkippedOnLoad(): boolean {
  return document.documentElement.hasAttribute(SPLASH_SKIP_ATTR);
}

// 앱을 열 때의 로딩 화면 (2026-10-25 사용자 결정: 로그인 애니메이션을 로딩 애니메이션으로도 쓴다. 규칙은 splashRules.ts).
// 앱 틀((app)/layout)에 있어서 서버 HTML에 들어간다 → 자바스크립트가 뜨기 전 첫 그리기부터 보이고, 그 아래에서 화면이 미리 그려진다.
// 앱 안에서 화면을 옮겨도 앱 틀은 다시 그려지지 않아 새로 열 때만 나온다.
// "데이터가 다 왔다" = 진행 중인 TanStack Query 요청이 0개. 화면마다 무엇을 기다릴지 따로 적지 않아도 되고,
// 기록 조회는 기기 사본 동기화까지 queryFn 안에서 기다리므로(syncForRead) 처음 로그인한 빈 사본도 채워진 뒤에 사라진다.
// 자바스크립트가 실패해도 갇히지 않게 8초 뒤 사라지는 것은 CSS가 따로 한다 (loginScreen.css app-splash-timeout)
export default function AppSplash() {
  // 하이드레이션 중이면 true(서버 값), 앱 안 이동으로 처음부터 브라우저에서 그리면 false.
  // 서버 HTML로 보인 화면은 페이지 시작(0)부터 보였고, 브라우저에서 그린 화면은 지금부터 보인다
  const isHydrating = useSyncExternalStore(
    subscribeNothing,
    () => false,
    () => true,
  );
  const [shownAt] = useState(() => (isHydrating ? 0 : performance.now()));
  // 앱 안 이동(체험하기)은 <head> 스크립트가 다시 돌지 않아 html 표시가 없다 → 여기서 읽어 이 요소에 붙인다.
  // 서버는 sessionStorage를 모르니 false (새로 연 페이지는 html 표시가 같은 일을 이미 했다)
  const isContinued = useSyncExternalStore(
    subscribeNothing,
    hasSplashContinue,
    () => false,
  );
  // 오프라인으로 연 페이지면 기다릴 응답이 없다. <head> 스크립트가 연 순간의 연결 상태로 붙인 표시를 읽는다:
  // 지금 연결 상태(useOnlineStatus)를 따르면 몇 초 안에 연결이 돌아왔을 때 다 그려진 화면 위로 로딩 화면이 다시 덮인다
  const isSkipped = useSyncExternalStore(
    subscribeNothing,
    isSkippedOnLoad,
    () => false,
  );
  const [phase, setPhase] = useState<Phase>('shown');
  const [isMinOver, setIsMinOver] = useState(false);
  const fetching = useIsFetching();

  // 최소·최대 시간 타이머
  useEffect(() => {
    const now = performance.now();
    const minTimer = setTimeout(
      () => setIsMinOver(true),
      remainingMinMs(now, shownAt),
    );
    const maxTimer = setTimeout(
      () => setPhase((current) => (current === 'shown' ? 'leaving' : current)),
      remainingMaxMs(now, shownAt),
    );
    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, [shownAt]);

  // 최소 시간이 지났고 요청이 SPLASH_SETTLE_MS 동안 0개면 사라진다. 요청이 새로 생기면 effect가 다시 돌며 타이머를 지운다
  useEffect(() => {
    if (phase !== 'shown' || !isMinOver || fetching > 0) return;
    const timer = setTimeout(() => setPhase('leaving'), SPLASH_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [phase, isMinOver, fetching]);

  // 페이드가 끝나면 DOM에서 뺀다. transitionend 대신 타이머: 동작 줄이기 설정이면 전환이 없어 이벤트가 오지 않는다
  useEffect(() => {
    if (phase !== 'leaving') return;
    const timer = setTimeout(() => setPhase('gone'), SPLASH_LEAVE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  // 한 번 이어 보였으면 표시를 지운다: 다음에 앱을 새로 열 때는 처음부터 등장한다
  useEffect(() => {
    if (phase === 'gone') clearSplashContinue();
  }, [phase]);

  if (phase === 'gone' || isSkipped) return null;

  return (
    <div
      className='login-screen app-splash'
      data-leaving={phase === 'leaving' ? '' : undefined}
      data-continued={isContinued ? '' : undefined}
      role='status'
    >
      <span className='sr-only'>nanaki를 여는 중</span>
      <div aria-hidden='true' className='contents'>
        <LoginHero wordmarkAs='p' />
        {/* PC는 로그인 화면이 버튼까지 묶어 세로 가운데에 둔다. 버튼 자리를 비워 두어야 이어질 때 아바타가 같은 자리에 있다 */}
        <div className='login-actions app-splash-actions-space' />
      </div>
    </div>
  );
}
