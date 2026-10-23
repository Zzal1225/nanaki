'use client';

// 'use client' 이유: 이 기기의 푸시 구독은 브라우저(서비스 워커)에만 있다
import { BellOff } from 'lucide-react';
import { useState } from 'react';
import { isPushConfigured } from '@/features/push/api/pushStore';
import { useThisDevicePush } from '@/features/push/hooks/useThisDevicePush';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import SettingsSection from './SettingsSection';

// 설정 > 알림: 이 기기에서 루틴 알림을 받는 중일 때만 보이고, 끄는 버튼 하나 (35a).
// 켜기는 루틴 폼의 "알림"에서만 한다 (2026-10-23 사용자 결정: 필요할 때 권한을 묻는다).
// 받는 중이 아니면 숨긴다: 켤 수 없는 버튼을 미리 두지 않는다 (CLAUDE.md: 미구현·쓸 수 없는 기능은 숨김)
export default function PushDeviceSection() {
  const { isSubscribed, unsubscribe } = useThisDevicePush();
  const [isPending, setIsPending] = useState(false);
  if (!isPushConfigured() || !isSubscribed) return null;

  async function turnOff() {
    setIsPending(true);
    try {
      await unsubscribe();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <SettingsSection title='알림'>
      <div className='flex min-h-16 items-center gap-2 pr-2 pl-4'>
        <span className='flex flex-1 flex-col'>
          <span className='text-body text-fg-primary'>이 기기 루틴 알림</span>
          <span className='text-caption text-fg-secondary'>
            이 기기에서 루틴 알림을 받고 있어요
          </span>
        </span>
        <button
          type='button'
          onClick={() => void turnOff()}
          disabled={isPending}
          className='inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-body-sm font-semibold text-fg-primary hover:bg-surface-hover active:bg-surface-pressed disabled:text-fg-disabled'
        >
          <BellOff
            aria-hidden='true'
            size={ICON_SIZE.sm}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          끄기
        </button>
      </div>
    </SettingsSection>
  );
}
