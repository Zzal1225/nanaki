import RecordsSidePanel from '@/features/records/overview/RecordsSidePanel';

// /records 아래 모든 화면(목록, 상세, 작성·수정 폼)의 틀.
// PC(lg 이상)는 왼쪽에 목록을 계속 두고 오른쪽에 상세·폼을 보여 준다 (시안: 목록 440px + 상세).
// 모바일·태블릿은 목록 없이 지금 화면(children)만 전체로 보여 준다. 폭에 따른 차이는 CSS로만 처리한다.
// 그래서 모바일에서도 왼쪽 목록이 숨은 채 그려진다. 1024px 이상에서만 그리게 바꿔 1만 건으로 재 봤지만(2026-10-24, 41)
// 기록 탭·검색 시간과 긴 작업에 차이가 없어 되돌렸다: 측정한 이득 없이 PC 왼쪽 목록만 한 박자 늦게 나온다
export default function RecordsLayout({ children }: LayoutProps<'/records'>) {
  return (
    <div className='lg:flex lg:h-dvh'>
      <aside
        aria-label='기록 목록'
        className='hidden lg:block lg:w-[440px] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-border'
      >
        <RecordsSidePanel />
      </aside>
      {/* 목록과 오른쪽 패널이 따로 스크롤된다 */}
      <div className='min-w-0 lg:flex-1 lg:overflow-y-auto'>{children}</div>
    </div>
  );
}
