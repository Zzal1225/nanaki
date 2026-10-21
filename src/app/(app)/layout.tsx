import BottomTabBar from '@/shared/layout/BottomTabBar';
import Sidebar from '@/shared/layout/Sidebar';
import QueryProvider from '@/shared/query/QueryProvider';

// 로그인 뒤 화면들의 공통 틀. (app) 괄호 폴더는 주소에 나타나지 않아서
// /login, /design-system은 이 틀 밖에 남는다
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    // 기록 데이터는 로그인 뒤 화면에서만 쓰므로 Provider도 이 틀 안에만 둔다
    <QueryProvider>
      <div className='flex min-h-dvh'>
        <Sidebar />
        {/* 모바일은 하단 탭이 위를 덮으므로 그 높이만큼 아래를 비운다 */}
        <main className='min-w-0 flex-1 pb-(--tab-bar-height) md:pb-0'>
          {children}
        </main>
        <BottomTabBar />
      </div>
    </QueryProvider>
  );
}
