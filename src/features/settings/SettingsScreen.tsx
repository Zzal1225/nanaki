import ThemeToggle from '@/shared/theme/ThemeToggle';
import AccountSection from './AccountSection';
import PushDeviceSection from './PushDeviceSection';
import SettingsBackLink from './SettingsBackLink';
import SettingsSection from './SettingsSection';
import TypeVisibilitySection from './TypeVisibilitySection';

// 설정 화면 (시안 8a). 서버 컴포넌트: 틀(제목·묶음 순서)은 미리 그리고, 데이터가 필요한 묶음만 클라이언트 컴포넌트다.
// 알림은 이 기기에서 받는 중일 때만 "끄기" 줄이 보인다 (PushDeviceSection, 35a).
// 시안의 체형 측정 항목(step2)·저장 공간과 백업(step4)·개인정보처리방침은 아직 없는 기능이라 두지 않는다
// (CLAUDE.md: 미구현 기능은 "준비 중" 버튼 없이 숨김)
export default function SettingsScreen() {
  return (
    <div className='mx-auto flex w-full max-w-xl flex-col pb-10'>
      {/* 모바일: ‹ 가운데 제목 (홈·기록 탭의 ⚙에서 들어온다, ‹는 들어온 곳으로). 태블릿·PC: 사이드바에서 들어와 뒤로 버튼 없이 왼쪽 큰 제목 */}
      {/* 스크롤해도 머리 줄(뒤로·닫기)이 맨 위에 붙어 있다 (2026-10-22 사용자 요청: 긴 화면에서 뒤로 가려고 다시 올라가기 불편). bg-bg: 밑으로 지나가는 내용이 비치지 않게, z-20: 떠 있는 + 버튼·메뉴(z-40) 아래 */}
      <div className='sticky top-0 z-20 flex h-14 items-center bg-bg px-1 md:h-auto md:px-6 md:pt-6 md:pb-2'>
        <SettingsBackLink />
        <h1 className='flex-1 text-center text-body font-semibold text-fg-primary md:text-left md:text-title-lg'>
          설정
        </h1>
        {/* 제목을 정확히 가운데 두기 위한 오른쪽 빈칸 (왼쪽 ‹ 버튼과 같은 너비) */}
        <span aria-hidden='true' className='size-11 md:hidden' />
      </div>

      <div className='flex flex-col gap-6 px-4 pt-2 md:px-6'>
        <TypeVisibilitySection />
        <SettingsSection title='화면'>
          <div className='flex min-h-16 items-center gap-2 pr-3 pl-4'>
            <span className='flex-1 text-body text-fg-primary'>다크모드</span>
            <ThemeToggle />
          </div>
        </SettingsSection>
        <PushDeviceSection />
        <AccountSection />
      </div>
    </div>
  );
}
