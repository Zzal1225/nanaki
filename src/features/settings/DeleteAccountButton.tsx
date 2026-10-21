'use client';

// 'use client' 이유: 확인 창 열림 상태, 삭제 요청, 화면 이동이 모두 브라우저에서 일어난다
import { useState } from 'react';
import { deleteAccount } from '@/features/auth/authActions';
import { LOGIN_PATH } from '@/features/auth/getAuthRedirectPath';
import { useToastStore } from '@/shared/toast/toastStore';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';

const FAILURE_MESSAGES = {
  unavailable: '지금은 계정을 삭제할 수 없어요. 잠시 후 다시 시도해 주세요.',
  failed: '계정을 삭제하지 못했어요. 다시 시도해 주세요.',
} as const;

// 설정 > 계정 > 계정 삭제 (시안 8b). 되돌릴 수 없어서 확인 창을 거친다.
// 시안의 "백업 파일 먼저 저장하기"는 백업(step4)이 생기면 확인 창에 넣는다
export default function DeleteAccountButton() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const showToast = useToastStore((state) => state.showToast);

  async function confirmDelete() {
    setIsPending(true);
    const result = await deleteAccount();
    if (result === 'deleted') {
      // 로그아웃과 같은 이유로 페이지를 새로 연다: 메모리 속 캐시(지운 계정의 기록)를 모두 버린다
      window.location.replace(LOGIN_PATH);
      return;
    }
    setIsPending(false);
    setIsConfirmOpen(false);
    showToast({ message: FAILURE_MESSAGES[result] });
  }

  return (
    <>
      <button
        type='button'
        onClick={() => setIsConfirmOpen(true)}
        className='flex min-h-14 w-full items-center border-t border-border px-4 text-left text-body text-danger hover:bg-surface-hover active:bg-surface-pressed'
      >
        계정 삭제
      </button>
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title='계정을 삭제할까요?'
        description='모든 기록과 설정이 영구적으로 삭제되고 복구할 수 없어요.'
        confirmLabel='계정 삭제'
        confirmVariant='danger'
        onConfirm={() => void confirmDelete()}
        isPending={isPending}
      />
    </>
  );
}
