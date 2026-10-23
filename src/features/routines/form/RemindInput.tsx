'use client';

// 'use client' 이유: 알림 켜기는 이 기기의 알림 권한을 묻고 푸시를 구독한다 (브라우저 API)
import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import type { PushSetupResult } from '@/features/push/api/pushStore';
import { useThisDevicePush } from '@/features/push/hooks/useThisDevicePush';
import { PUSH_UNAVAILABLE_MESSAGE } from '@/features/push/pushSupport';
import FieldError from '@/shared/ui/FieldError';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { SwitchControl } from '@/shared/ui/Switch';
import { formatRemindTime, listRemindTimes } from '../schema/routine';

type RemindInputProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
};

// 켤 때 처음 고르는 시각 (아침에 하루 루틴을 떠올리게)
const DEFAULT_REMIND_AT = '09:00';
const REMIND_TIMES = listRemindTimes();

// 켜기 결과에 따른 안내. 받는 중이면 안내 없음
function resultMessage(result: PushSetupResult): string | null {
  switch (result) {
    case 'subscribed':
      return null;
    case 'notConfigured':
    case 'failed':
      return '이 기기에서 알림을 켜지 못했어요. 잠시 후 다시 시도해 주세요';
    default:
      return PUSH_UNAVAILABLE_MESSAGE[result];
  }
}

// 루틴 알림 (35a, 2026-10-23 사용자 결정): 켜는 순간에만 이 기기의 알림 권한을 묻는다(필요할 때 물어야 허용률이 높고,
// 아이폰은 버튼을 눌러야만 물을 수 있다). 시각은 10분 단위, 일정이 있는 날 아직 안 했으면 보낸다(보내기는 35b).
// 시각은 루틴에 저장되고 알림은 구독한 모든 기기로 간다: 이 기기에서 못 켜도(권한 거절 등) 시각은 저장한다
export default function RemindInput({
  value,
  onChange,
  error,
}: RemindInputProps) {
  const switchId = useId();
  const selectId = useId();
  const errorId = useId();
  const [message, setMessage] = useState<string | null>(null);
  const { subscribe } = useThisDevicePush();
  const isOn = value !== null;

  async function toggle(checked: boolean) {
    if (!checked) {
      // 이 기기 구독은 그대로 둔다: 다른 루틴의 알림도 이 구독으로 온다 (기기 알림 끄기는 설정에서)
      onChange(null);
      setMessage(null);
      return;
    }
    onChange(value ?? DEFAULT_REMIND_AT);
    setMessage(resultMessage(await subscribe()));
  }

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center gap-3'>
        <label htmlFor={switchId} className='flex-1'>
          <span className='block text-body-sm font-medium text-fg-primary'>
            알림
          </span>
          <span className='block text-caption text-fg-secondary'>
            일정이 있는 날, 아직 안 했으면 알려 줘요
          </span>
        </label>
        <SwitchControl
          id={switchId}
          checked={isOn}
          onCheckedChange={(checked) => void toggle(checked)}
        />
      </div>
      {isOn && (
        <div className='relative flex items-center'>
          <label htmlFor={selectId} className='sr-only'>
            알림 시각
          </label>
          <select
            id={selectId}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            // 16px(text-body): 아이폰은 16px보다 작은 선택칸을 누르면 화면을 확대한다. 아이폰에서는 바퀴로 고른다
            className='min-h-11 w-full appearance-none rounded-md border border-border bg-surface pr-10 pl-3 text-body text-fg-primary tabular-nums'
          >
            {REMIND_TIMES.map((time) => (
              <option key={time} value={time}>
                {formatRemindTime(time)}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden='true'
            size={ICON_SIZE.sm}
            strokeWidth={ICON_STROKE_WIDTH}
            className='pointer-events-none absolute right-3 text-fg-secondary'
          />
        </div>
      )}
      {message && (
        <p role='status' className='text-caption text-fg-secondary'>
          {message}
        </p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}
