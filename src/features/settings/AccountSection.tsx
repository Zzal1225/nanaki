'use client';

// 'use client' 이유: 브라우저에 저장된 세션에서 지금 계정(이메일·체험 여부)을 읽는다
import { GUEST_RETENTION_DAYS } from '@/features/auth/guestRetention';
import LogoutButton from '@/features/auth/LogoutButton';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import DeleteAccountButton from './DeleteAccountButton';
import SettingsSection from './SettingsSection';

// 설정 > 계정: 누구로 로그인했는지 + 로그아웃 + 계정 삭제 (시안 8a 맨 아래 묶음)
export default function AccountSection() {
  const user = useCurrentUser().data;

  return (
    <SettingsSection title='계정'>
      <p className='flex min-h-14 flex-col justify-center border-b border-border px-4 py-2'>
        {user === undefined ? (
          <span
            aria-busy='true'
            className='h-5 w-40 animate-pulse rounded-sm bg-surface-hover'
          />
        ) : user?.isAnonymous ? (
          <>
            <span className='text-body text-fg-primary'>체험 계정</span>
            <span className='text-caption text-fg-secondary'>
              만든 지 {GUEST_RETENTION_DAYS}일 뒤 자동으로 삭제되고,
              로그아웃하면 다시 들어올 수 없어요
            </span>
          </>
        ) : (
          <>
            <span className='text-caption text-fg-secondary'>구글 계정</span>
            <span className='truncate text-body text-fg-primary'>
              {user?.email ?? ''}
            </span>
          </>
        )}
      </p>
      {/* 계정 종류를 알기 전에는 누를 수 없게 한다: 체험 계정이 확인 창 없이 로그아웃되면 안 된다 */}
      {user === undefined ? (
        <div aria-hidden='true' className='min-h-14' />
      ) : (
        <LogoutButton isAnonymous={user?.isAnonymous ?? false} />
      )}
      <DeleteAccountButton />
    </SettingsSection>
  );
}
