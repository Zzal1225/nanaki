import type { Metadata } from 'next';
import PagePlaceholder from '@/shared/layout/PagePlaceholder';

export const metadata: Metadata = {
  title: '나키',
};

export default function NakiPage() {
  return (
    <PagePlaceholder
      title='나키'
      description='기록에 대해 물어보는 AI 채팅이 들어올 자리예요.'
    />
  );
}
