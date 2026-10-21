import type { Metadata } from 'next';
import RecordsOverview from '@/features/records/overview/RecordsOverview';

export const metadata: Metadata = {
  title: '기록',
};

// 페이지는 서버 컴포넌트로 두고(제목 등 메타데이터), 기록을 불러오는 부분만 클라이언트 컴포넌트에 맡긴다
export default function RecordsPage() {
  return <RecordsOverview />;
}
