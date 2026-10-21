import type { Metadata } from 'next';
import RecordsOverview from '@/features/records/overview/RecordsOverview';

export const metadata: Metadata = {
  title: '기록',
};

// 모바일·태블릿: 목록이 이 화면 자체. PC: 목록은 layout이 왼쪽에 이미 보여 주므로 오른쪽 패널에 안내만.
// PC에서도 아래 목록이 함께 그려지지만 display:none이라 보이지 않고, 같은 쿼리 키라 조회는 한 번만 나간다
export default function RecordsPage() {
  return (
    <>
      <div className='lg:hidden'>
        <RecordsOverview />
      </div>
      <p className='hidden h-full items-center justify-center text-body text-fg-secondary lg:flex'>
        기록을 고르면 여기에 보여요
      </p>
    </>
  );
}
