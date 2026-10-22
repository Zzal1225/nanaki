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
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    // 기록 데이터는 로그인 뒤 화면에서만 쓰므로 Provider도 이 틀 안에만 둔다
    <QueryProvider>
      <div className='flex min-h-dvh'>
        <Sidebar action={<SidebarNewRecordMenu />} />
        {/* 모바일은 하단 탭과 떠 있는 + 버튼이 위를 덮으므로 그만큼 아래를 비운다 (globals.css --fab-clearance).
            키보드가 떠 있으면 그 높이(--keyboard-inset, KeyboardInset)도 더해 맨 아래 입력칸을 키보드 위로 올릴 공간을 만든다 */}
        <main className='min-w-0 flex-1 pb-[calc(var(--tab-bar-height)+var(--fab-clearance)+var(--keyboard-inset,0px))] md:pb-0'>
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
      </div>
    </QueryProvider>
  );
}
