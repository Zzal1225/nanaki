import type { Metadata } from 'next';
import NakiScreen from '@/features/naki/ui/NakiScreen';

export const metadata: Metadata = {
  title: '나키',
};

// 주소에 값이 없는 화면이라 정적 한 장 (오프라인에서도 열려 "쓸 수 없어요" 안내를 보여 준다)
export default function NakiPage() {
  return <NakiScreen />;
}
