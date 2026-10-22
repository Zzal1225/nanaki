'use client';

// 'use client' 이유: 들어온 곳(?from=)을 브라우저가 주소에서 읽는다. 서버가 읽으면 설정 화면이 요청 때 그리는 화면(◐)이 되어
// 서비스 워커가 저장해 둔 한 장으로 오프라인에서 열 수 없다 (CLAUDE.md: 오프라인에서 열려야 하는 화면은 브라우저가 읽는다)
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { settingsBackHref } from '@/shared/layout/settingsRoutes';

// 모바일 설정 머리의 ‹. 홈의 ⚙에서 왔으면 홈으로, 기록 탭의 ⚙에서 왔으면 기록 탭으로 (2026-10-22 기록 탭에도 ⚙)
export default function SettingsBackLink() {
  return (
    // 주소를 읽기 전(미리 그린 HTML)에는 홈으로 가는 같은 모양을 먼저 보여 준다
    <Suspense fallback={<BackLink href={settingsBackHref(null)} />}>
      <BackLinkFromUrl />
    </Suspense>
  );
}

function BackLinkFromUrl() {
  return <BackLink href={settingsBackHref(useSearchParams().get('from'))} />;
}

function BackLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label={href === '/' ? '홈으로' : '기록으로'}
      className='inline-flex size-11 items-center justify-center rounded-md text-fg-primary hover:bg-surface-hover active:bg-surface-pressed md:hidden'
    >
      <ChevronLeft
        aria-hidden='true'
        size={ICON_SIZE.lg}
        strokeWidth={ICON_STROKE_WIDTH}
      />
    </Link>
  );
}
