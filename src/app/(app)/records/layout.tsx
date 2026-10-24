import RecordsSidePanel from '@/features/records/overview/RecordsSidePanel';
import WideLayoutOnly from '@/shared/layout/WideLayoutOnly';

// /records 아래 모든 화면(목록, 상세, 작성·수정 폼)의 틀.
// PC(lg 이상)는 왼쪽에 목록을 계속 두고 오른쪽에 상세·폼을 보여 준다 (시안: 목록 440px + 상세).
// 모바일·태블릿은 목록 없이 지금 화면(children)만 전체로 보여 준다. 폭에 따른 차이는 CSS로만 처리한다
export default function RecordsLayout({ children }: LayoutProps<'/records'>) {
  return (
    <div className='lg:flex lg:h-dvh'>
      <aside
        aria-label='기록 목록'
        className='hidden lg:block lg:w-[440px] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-border'
      >
        {/* 숨은 모바일·태블릿에서는 목록을 그리지도 조회하지도 않는다 (WideLayoutOnly, 41 1만 건 성능) */}
        <WideLayoutOnly>
          <RecordsSidePanel />
        </WideLayoutOnly>
      </aside>
      {/* 목록과 오른쪽 패널이 따로 스크롤된다 */}
      <div className='min-w-0 lg:flex-1 lg:overflow-y-auto'>{children}</div>
    </div>
  );
}
