'use client';

// 'use client' 이유: 알림 켜기는 이 기기의 알림 권한을 묻고 푸시를 구독한다 (브라우저 API)
import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { usePushSupport } from '@/features/push/hooks/usePushSupport';
import { useThisDevicePush } from '@/features/push/hooks/useThisDevicePush';
import { pushSetupMessage } from '@/features/push/pushMessages';
import { PUSH_UNAVAILABLE_MESSAGE } from '@/features/push/pushSupport';
import FieldError from '@/shared/ui/FieldError';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { SwitchControl } from '@/shared/ui/Switch';
import {
  DEFAULT_REMIND_AT,
  formatRemindTime,
  listRemindTimes,
} from '../schema/routine';

type RemindInputProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
};

const REMIND_TIMES = listRemindTimes();

// 루틴 알림 (35a, 2026-10-23 사용자 결정): 시각은 10분 단위, 일정이 있는 날 아직 안 했으면 보낸다(보내기는 35b).
// 시각은 루틴에 저장되고 알림은 구독한 모든 기기로 간다: 이 기기에서 못 켜도(권한 거절 등) 시각은 저장한다.
// 새 루틴은 알림이 켜진 채 시작한다 (2026-10-25 사용자 결정). 웹은 사용자가 누르기 전에는 권한을 물을 수 없어서
// (아이폰은 무시한다) 이 기기 권한은 저장 버튼을 누를 때 묻는다 (RoutineForm). 여기서 스위치를 직접 켜면 그때 바로 묻는다
export default function RemindInput({
  value,
  onChange,
  error,
}: RemindInputProps) {
  const switchId = useId();
  const selectId = useId();
  const errorId = useId();
  const [message, setMessage] = useState<string | null>(null);
  const { subscribe, isSubscribed, isChecking } = useThisDevicePush();
  const support = usePushSupport();
  const isOn = value !== null;
  // 켜져 있는데 이 기기가 아직 받지 않을 때: 저장하면 무엇이 일어나는지(권한 묻기) 또는 왜 이 기기로는 안 오는지 미리 알린다
  const pendingHint =
    isOn && !isSubscribed && !isChecking && support !== null
      ? support === 'supported'
        ? '저장하면 이 기기에서 알림을 허용할지 물어요'
        : PUSH_UNAVAILABLE_MESSAGE[support]
      : null;
  const shownMessage = message ?? pendingHint;

  async function toggle(checked: boolean) {
    if (!checked) {
      // 이 기기 구독은 그대로 둔다: 다른 루틴의 알림도 이 구독으로 온다 (기기 알림 끄기는 설정에서)
      onChange(null);
      setMessage(null);
      return;
    }
    onChange(value ?? DEFAULT_REMIND_AT);
    // 권한 묻기·구독·서버 저장이 아이폰에서 몇 초 걸린다: 그동안 아무 표시가 없으면 안 켜진 줄 안다 (2026-10-25 아이폰 확인 4)
    setMessage('이 기기 알림을 켜는 중…');
    setMessage(pushSetupMessage(await subscribe()));
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
      {/* 안내는 스위치 바로 아래: 시각 칸 아래(폼 끝)에 두었더니 새 루틴 화면에서 아래에 붙은 저장 줄에 가려
          아이폰 Safari 탭의 "홈 화면 앱에서만" 안내가 안 보였다 (2026-10-24 아이폰 확인, 로컬 재현) */}
      {shownMessage && (
        <p role='status' className='text-caption text-fg-secondary'>
          {shownMessage}
        </p>
      )}
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
      <FieldError id={errorId} message={error} />
    </div>
  );
}
