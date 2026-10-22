import type { Metadata } from 'next';
import { WifiOff } from 'lucide-react';
import { ICON_STROKE_WIDTH } from '@/shared/ui/icon';

export const metadata: Metadata = {
  title: '오프라인',
};

// 연결이 없고, 서비스 워커에 저장해 둔 화면도 없을 때 대신 보여 주는 화면 (src/sw/sw.ts의 fallbacks).
// 서비스 워커가 설치될 때 미리 받아 둔다. 데이터를 쓰지 않는 정적 화면이라 어떤 상태에서도 그려진다.
// 앱 틀(하단 탭·사이드바) 밖에 둔다: 틀은 로그인·설정을 읽는데, 이 화면은 그것도 못 읽는 상황이다
export default function OfflinePage() {
  return (
    <main className='mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 px-6 text-center'>
      <WifiOff
        aria-hidden='true'
        size={48}
        strokeWidth={ICON_STROKE_WIDTH}
        className='text-fg-secondary'
      />
      <h1 className='text-title text-fg-primary'>오프라인이에요</h1>
      <p className='text-body text-pretty text-fg-secondary'>
        이 화면은 아직 기기에 저장되지 않았어요. 연결되면 다시 열어 주세요.
      </p>
      {/* 홈은 한 번이라도 열었다면 저장돼 있어 오프라인에서도 열린다.
          Link 대신 a: Link는 화면 조각(RSC)만 따로 받는데 그 조각은 저장돼 있지 않을 수 있다.
          문서 전체를 다시 요청해야 서비스 워커가 저장해 둔 홈 HTML을 내준다 */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 위 이유: 오프라인에서는 문서 전체 이동이어야 한다 */}
      <a
        href='/'
        className='mt-2 inline-flex min-h-11 items-center rounded-md px-4 text-body-sm font-semibold text-accent underline underline-offset-4'
      >
        홈으로
      </a>
    </main>
  );
}
