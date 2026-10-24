'use client';

// 'use client' 이유: 이 기기의 푸시 구독은 브라우저(서비스 워커)에만 있고, 켤 때 브라우저 알림 권한을 묻는다
import { useId, useState } from 'react';
import { isPushConfigured } from '@/features/push/api/pushStore';
import { usePushSupport } from '@/features/push/hooks/usePushSupport';
import { useThisDevicePush } from '@/features/push/hooks/useThisDevicePush';
import { pushSetupMessage } from '@/features/push/pushMessages';
import { PUSH_UNAVAILABLE_MESSAGE } from '@/features/push/pushSupport';
import { SwitchControl } from '@/shared/ui/Switch';
import SettingsSection from './SettingsSection';

// 설정 > 알림: "이 기기 루틴 알림" 켜기·끄기 스위치 (35a, 2026-10-24 사용자 결정으로 바꿈).
// 처음(10-23)에는 받는 중일 때만 "끄기" 버튼을 두고 켜기는 루틴 폼에서만 했는데, 끄면 버튼이 사라져 여기서 다시 켤 수 없었다.
// 이제 늘 보이고, 이 기기에서 받을 수 없으면(아이폰 Safari 탭·차단·미지원) 스위치를 끄고 이유를 보여 준다.
// 켤 때 권한을 묻는다: 아이폰은 사용자가 누른 그 처리 안에서만 물을 수 있어 스위치 처리에서 바로 부른다 (useThisDevicePush 설명)
export default function PushDeviceSection() {
  const labelId = useId();
  const { isSubscribed, subscribe, unsubscribe } = useThisDevicePush();
  const support = usePushSupport();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 공개 키가 없는 배포(알림 보내기가 없음)와 기기 판단 전에는 그리지 않는다 (CLAUDE.md: 쓸 수 없는 기능은 숨김)
  if (!isPushConfigured() || support === null) return null;

  // 받는 중이면 끌 수는 있어야 한다 (권한을 나중에 막았더라도 이 기기 구독은 지울 수 있게)
  const canToggle = isSubscribed || support === 'supported';
  const reason =
    !isSubscribed && support !== 'supported'
      ? PUSH_UNAVAILABLE_MESSAGE[support]
      : null;

  async function toggle(checked: boolean) {
    setMessage(null);
    setIsPending(true);
    try {
      if (checked) {
        setMessage(pushSetupMessage(await subscribe()));
      } else {
        await unsubscribe();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <SettingsSection title='알림'>
      <div className='flex flex-col gap-1 py-2 pr-3 pl-4'>
        <div className='flex min-h-12 items-center gap-2'>
          <span id={labelId} className='flex flex-1 flex-col'>
            <span className='text-body text-fg-primary'>이 기기 루틴 알림</span>
            <span className='text-caption text-fg-secondary'>
              {isSubscribed
                ? '이 기기에서 루틴 알림을 받고 있어요'
                : '켜면 이 기기에서 루틴 알림을 받아요'}
            </span>
          </span>
          <SwitchControl
            aria-labelledby={labelId}
            checked={isSubscribed}
            disabled={!canToggle || isPending}
            onCheckedChange={(checked) => void toggle(checked)}
          />
        </div>
        {(reason ?? message) && (
          <p role='status' className='pb-1 text-caption text-fg-secondary'>
            {reason ?? message}
          </p>
        )}
      </div>
    </SettingsSection>
  );
}
