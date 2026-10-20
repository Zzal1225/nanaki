import type { Metadata } from 'next';
import PagePlaceholder from '@/shared/layout/PagePlaceholder';

export const metadata: Metadata = {
  title: '기록',
};

export default function RecordsPage() {
  return (
    <PagePlaceholder
      title='기록'
      description='모든 기록을 찾아보고 거르는 화면이 들어올 자리예요.'
    />
  );
}
