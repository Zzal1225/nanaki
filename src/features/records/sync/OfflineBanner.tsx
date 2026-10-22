'use client';

// 'use client' 이유: 브라우저의 연결 상태(online/offline 이벤트)를 따라 보였다 숨는다
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/shared/network/useOnlineStatus';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';

// 오프라인일 때만 보이는 안내 (시안 15a). 온라인일 때는 동기화 표시를 전혀 하지 않는다 (README 4).
// role=status: 연결이 끊기는 순간 화면 읽기 프로그램이 읽어 준다.
// warning 색은 가계부 색과 가까워서 늘 아이콘을 함께 쓴다 (design/README 토큰 메모)
export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className='mx-auto w-full max-w-xl px-4 pt-3 md:px-6'>
      <p
        role='status'
        className='flex min-h-11 items-center gap-3 rounded-md border border-border bg-surface-raised px-4 py-3 text-body-sm text-fg-primary'
      >
        <WifiOff
          aria-hidden='true'
          size={ICON_SIZE.md}
          strokeWidth={ICON_STROKE_WIDTH}
          className='shrink-0 text-warning'
        />
        오프라인이에요. 작성한 기록은 연결되면 저장돼요
      </p>
    </div>
  );
}
