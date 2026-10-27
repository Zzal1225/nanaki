import { preconnect } from 'react-dom';
import AppSplash from '@/features/auth/login/AppSplash';
import SidebarNewRecordMenu from '@/features/records/entry/SidebarNewRecordMenu';
import SpeedDial from '@/features/records/entry/SpeedDial';
import OfflineBanner from '@/features/records/sync/OfflineBanner';
import OfflineWarmup from '@/features/records/sync/OfflineWarmup';
import OutboxSync from '@/features/records/sync/OutboxSync';
import BottomTabBar from '@/shared/layout/BottomTabBar';
import KeyboardInset from '@/shared/layout/KeyboardInset';
import Sidebar from '@/shared/layout/Sidebar';
import QueryProvider from '@/shared/query/QueryProvider';
import Toaster from '@/shared/toast/Toaster';

// 로그인 뒤 화면들의 공통 틀. (app) 괄호 폴더는 주소에 나타나지 않아서
// /login, /design-system은 이 틀 밖에 남는다
// 로그인 뒤 화면의 데이터는 모두 Supabase(다른 출처)에서 온다. 연결(DNS·TCP·TLS)은 보통 JS가 받아져 돌고 첫 조회를 보낼 때
// 시작돼서, 느린 망에서는 JS를 받는 시간 뒤에 연결 시간이 그대로 더해진다. HTML을 받자마자 미리 연결해 두면 JS를 받는 동안 끝난다.
// 배포 Lighthouse 진단(2026-10-27): Supabase 요청을 막으면 기록 탭 추정 LCP가 6.7~7.3초 → 2.1~2.6초 (docs/performance.md).
// crossOrigin anonymous: supabase-js는 쿠키 없이(Authorization 헤더) CORS로 부른다. 연결 모드가 다르면 미리 연 연결을 쓰지 않는다.
// 로그인 화면에는 두지 않는다: 첫 화면에서 Supabase를 부르지 않아 쓰이지 않는 연결이 된다.
// 환경 변수가 없는 빌드(테스트 등)에서는 건너뛴다: 미리 연결은 빨라지게 할 뿐 없어도 동작은 같다
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export default function AppLayout({ children }: LayoutProps<'/'>) {
  if (SUPABASE_URL) preconnect(SUPABASE_URL, { crossOrigin: 'anonymous' });
  return (
    // 기록 데이터는 로그인 뒤 화면에서만 쓰므로 Provider도 이 틀 안에만 둔다
    <QueryProvider>
      {/* shrink-0: body는 세로 flex 상자이고, 홈 화면 앱에서는 body 높이가 화면 높이로 고정된다(globals.css, #77).
          그러면 이 틀이 화면 높이까지 눌려(min-h-dvh가 flex 항목의 "내용보다 작아지지 않음"을 덮어씀) 내용이 아래 여백 자리를 차지했다.
          본문 끝 여백(+ 버튼·키보드)이 사라져 루틴 +/−가 + 버튼에 가리고, 키보드가 메모 칸을 가렸다 (2026-10-23 아이폰 진단: body 스크롤 높이 = 화면 높이 793).
          사파리 탭은 body 높이가 고정이 아니라 생기지 않았다 */}
      <div className='flex min-h-dvh shrink-0'>
        <Sidebar action={<SidebarNewRecordMenu />} />
        {/* 모바일은 하단 탭과 떠 있는 + 버튼이 위를 덮으므로 그만큼 아래를 비운다 (globals.css --fab-clearance).
            키보드가 떠 있으면 그 높이(--keyboard-inset, KeyboardInset)도 더해 맨 아래 입력칸을 키보드 위로 올릴 공간을 만든다.
            인쇄(보고서 PDF)에는 탭·버튼이 없어서 비운다: 남겨 두면 끝에 빈 쪽이 생길 수 있다 */}
        <main className='min-w-0 flex-1 pb-[calc(var(--tab-bar-height)+var(--fab-clearance)+var(--keyboard-inset,0px))] md:pb-0 print:pb-0'>
          {/* 오프라인일 때만 화면 맨 위에 안내 (모든 기록 화면 공통) */}
          <OfflineBanner />
          {children}
        </main>
        <BottomTabBar />
        {/* 모바일 전용 작성 버튼. 태블릿·PC는 사이드바의 "새 기록"이 맡는다 */}
        <SpeedDial />
        {/* 화면을 옮겨 가도 남는 알림(삭제 → 홈에서 되돌리기)이라 앱 틀에 하나 둔다 */}
        <Toaster />
        {/* 오프라인에서 쓴 기록을 연결되면 보낸다. 그리는 것은 없다 */}
        <OutboxSync />
        {/* 연 적 없는 화면도 오프라인에서 열리게 주요 화면을 미리 받아 둔다. 그리는 것은 없다 */}
        <OfflineWarmup />
        {/* 화면 키보드가 아래 입력칸을 가리지 않게 (높이 재기·스크롤). 그리는 것은 없다 */}
        <KeyboardInset />
        {/* 앱을 새로 열 때의 로딩 화면: 데이터 요청이 끝날 때까지 위를 덮는다. 요청을 보려고 QueryProvider 안에 둔다 */}
        <AppSplash />
      </div>
    </QueryProvider>
  );
}
