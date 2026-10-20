import type { Metadata } from 'next';
import PagePlaceholder from '@/shared/layout/PagePlaceholder';

export const metadata: Metadata = {
  title: '설정',
};

export default function SettingsPage() {
  return (
    <PagePlaceholder
      title='설정'
      description='타입 켜기·끄기, 테마, 계정 관리가 들어올 자리예요.'
    />
  );
}
