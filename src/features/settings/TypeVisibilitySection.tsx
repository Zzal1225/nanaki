'use client';

// 'use client' 이유: 스위치를 누르면 설정을 저장하고(TanStack mutation) 화면을 바로 바꾼다
import { EyeOff } from 'lucide-react';
import { useId } from 'react';
import { RECORD_TYPE_ORDER } from '@/features/records/entry/newRecordMenu';
import {
  RECORD_TYPE_CONFIG,
  type RecordType,
} from '@/features/records/schema/recordTypes';
import { RECORD_TYPE_STYLE } from '@/features/records/ui/recordTypeStyle';
import { ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { SwitchControl } from '@/shared/ui/Switch';
import SettingsSection from './SettingsSection';
import { useUpdateHiddenTypes, useUserSettings } from './hooks/useUserSettings';
import { canHideType, setTypeHidden } from './typeVisibility';

// 시안 규격: 타입 아이콘 18px, 설명 줄 아이콘 14px
const TYPE_ICON_SIZE = 18;
const HINT_ICON_SIZE = 14;

// 설정 > 기록 타입 (시안 8a). 끄면 작성 메뉴·기록 탭·캘린더에서 숨고, 기록은 지워지지 않는다
export default function TypeVisibilitySection() {
  const settings = useUserSettings();
  const updateHiddenTypes = useUpdateHiddenTypes();

  // 불러오기 전에는 스위치를 그리지 않는다: 모두 켜진 모양으로 그렸다가 꺼진 것으로 바뀌면 깜빡이고,
  // 그 사이에 누르면 서버 값을 모른 채 덮어쓴다
  if (!settings.data) {
    return (
      <SettingsSection title='기록 타입'>
        <div aria-busy='true' className='h-28 animate-pulse bg-surface-hover' />
      </SettingsSection>
    );
  }

  const { hiddenTypes } = settings.data;

  return (
    <SettingsSection title='기록 타입'>
      <ul>
        {RECORD_TYPE_ORDER.map((type) => (
          <TypeRow
            key={type}
            type={type}
            isVisible={!hiddenTypes.includes(type)}
            canToggle={canHideType(hiddenTypes, type)}
            onChange={(isVisible) =>
              updateHiddenTypes.mutate(
                setTypeHidden(hiddenTypes, type, !isVisible),
              )
            }
          />
        ))}
      </ul>
    </SettingsSection>
  );
}

type TypeRowProps = {
  type: RecordType;
  isVisible: boolean;
  // 마지막 하나 남은 켜진 타입이면 false
  canToggle: boolean;
  onChange: (isVisible: boolean) => void;
};

function TypeRow({ type, isVisible, canToggle, onChange }: TypeRowProps) {
  const labelId = useId();
  const hintId = useId();
  const style = RECORD_TYPE_STYLE[type];
  const Icon = style.icon;
  const hint = !isVisible
    ? '기록은 지워지지 않고 숨겨져요'
    : !canToggle
      ? '하나는 켜 두어야 해요'
      : null;

  return (
    <li className='flex min-h-14 items-center gap-3 border-t border-border py-2 pr-2 pl-4 first:border-t-0'>
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-md ${style.subtleBgClass} ${style.textClass}`}
      >
        <Icon
          aria-hidden='true'
          size={TYPE_ICON_SIZE}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </span>
      <div className='flex min-w-0 flex-1 flex-col'>
        <span
          id={labelId}
          className={`text-body font-medium ${isVisible ? 'text-fg-primary' : 'text-fg-secondary'}`}
        >
          {RECORD_TYPE_CONFIG[type].label}
        </span>
        {hint && (
          <span
            id={hintId}
            className='flex items-center gap-1 text-caption text-fg-secondary'
          >
            {!isVisible && (
              <EyeOff
                aria-hidden='true'
                size={HINT_ICON_SIZE}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            )}
            {hint}
          </span>
        )}
      </div>
      {/* 스위치 버튼이 44×44(Switch.tsx). 오른쪽 여백을 맞추려고 폭만 조금 넓게 둔다 */}
      <span className='flex h-11 w-14 items-center justify-center'>
        <SwitchControl
          checked={isVisible}
          disabled={!canToggle}
          onCheckedChange={onChange}
          aria-labelledby={labelId}
          aria-describedby={hint ? hintId : undefined}
        />
      </span>
    </li>
  );
}
