'use client';

// 'use client' 이유: 로그아웃 요청, 확인 창 열림 상태, 화면 이동이 모두 브라우저에서 일어난다
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { useToastStore } from '@/shared/toast/toastStore';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { signOut } from './authActions';
import { LOGIN_PATH } from './getAuthRedirectPath';

type LogoutButtonProps = {
  // 체험 계정이면 로그아웃 전에 한 번 묻는다
  isAnonymous: boolean;
};

// 설정의 로그아웃 줄.
// 로그아웃 뒤에는 router 이동이 아니라 페이지를 새로 연다(location.replace): TanStack Query 캐시, 토스트(Zustand) 같은
// 메모리 속 상태가 모두 사라져서, 다음에 로그인한 사람에게 앞 사람의 기록이 잠깐이라도 보이는 일이 없다.
// replace라 뒤로 가기로 로그인 뒤 화면에 돌아오지 않는다 (돌아와도 proxy가 /login으로 보낸다)
export default function LogoutButton({ isAnonymous }: LogoutButtonProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const showToast = useToastStore((state) => state.showToast);

  async function logout() {
    setIsPending(true);
    const error = await signOut();
    if (error) {
      setIsPending(false);
      setIsConfirmOpen(false);
      showToast({ message: '로그아웃하지 못했어요. 다시 시도해 주세요.' });
      return;
    }
    window.location.replace(LOGIN_PATH);
  }

  return (
    <>
      <button
        type='button'
        disabled={isPending}
        // 구글 계정은 다시 로그인하면 되니 묻지 않는다. 체험 계정은 이름도 비밀번호도 없어서 나가면 끝이다
        onClick={() => (isAnonymous ? setIsConfirmOpen(true) : void logout())}
        className='flex min-h-14 w-full items-center gap-3 px-4 text-left text-body text-fg-primary hover:bg-surface-hover active:bg-surface-pressed disabled:text-fg-disabled'
      >
        <LogOut
          aria-hidden='true'
          size={ICON_SIZE.md}
          strokeWidth={ICON_STROKE_WIDTH}
          className='text-fg-secondary'
        />
        로그아웃
      </button>
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title='체험을 끝낼까요?'
        description='체험 계정은 로그아웃하면 다시 들어올 수 없고, 남긴 기록도 볼 수 없어요.'
        confirmLabel='로그아웃'
        confirmVariant='danger'
        onConfirm={() => void logout()}
        isPending={isPending}
      />
    </>
  );
}
