'use client';

// 'use client' 이유: 열림 상태와 포커스 가두기·Esc 닫기가 브라우저에서 일어난다
import { AlertDialog } from 'radix-ui';
import type { ReactNode } from 'react';
import Button from './Button';

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  // 되돌릴 수 없는 일(계정 삭제)은 danger, 그 밖은 primary
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void;
  // 확인을 누른 뒤 처리 중이면 버튼에 로딩을 보여 주고 다시 누르지 못하게
  isPending?: boolean;
};

// 되돌릴 수 없는 일 앞에서 한 번 더 묻는 창 (시안: 계정 삭제·로그아웃 확인).
// Dialog가 아니라 AlertDialog인 이유: 바깥을 눌러도 닫히지 않고, 열리면 포커스가 "취소"로 가서
// 실수로 Enter를 눌러도 위험한 쪽이 실행되지 않는다. role="alertdialog"로 화면 읽기 프로그램이 바로 읽어 준다
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmVariant = 'primary',
  onConfirm,
  isPending = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className='fixed inset-0 z-50 bg-overlay' />
        <AlertDialog.Content className='fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-48px)] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col gap-2 rounded-lg bg-surface-raised px-5 pt-6 pb-5 shadow-float'>
          <AlertDialog.Title className='text-title text-fg-primary'>
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className='text-body-sm text-pretty text-fg-secondary'>
            {description}
          </AlertDialog.Description>
          {/* 시안: 버튼을 위아래로 꽉 채워 쌓는다. 엄지가 닿는 아래쪽이 "취소"라 실수로 위험한 쪽을 누르기 어렵다 */}
          <div className='mt-3 flex flex-col gap-2'>
            {/* AlertDialog.Action은 누르면 바로 닫힌다. 처리가 끝날 때까지 열어 두려고 보통 버튼을 쓴다 */}
            <Button
              variant={confirmVariant}
              isLoading={isPending}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
            <AlertDialog.Cancel asChild>
              <Button variant='secondary' disabled={isPending}>
                취소
              </Button>
            </AlertDialog.Cancel>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
