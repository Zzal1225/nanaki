'use client';

// 'use client' 이유: 로그아웃 요청, 확인 창 열림 상태, 기기 데이터 지우기, 화면 이동이 모두 브라우저에서 일어난다
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import {
  listPendingRecordIds,
  sendPendingRecords,
} from '@/features/records/api/recordStore';
import { prepareDeviceDataCleanup } from '@/lib/db/deviceData';
import { useToastStore } from '@/shared/toast/toastStore';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { signOut } from './authActions';
import { LOGIN_PATH } from './getAuthRedirectPath';

type LogoutButtonProps = {
  // 체험 계정이면 로그아웃 전에 한 번 묻는다
  isAnonymous: boolean;
};

const GUEST_NOTICE =
  '체험 계정은 로그아웃하면 다시 들어올 수 없고, 남긴 기록도 볼 수 없어요.';

// 확인 창에 보일 내용. 묻지 않아도 되면 null
export function logoutConfirmText(
  pendingCount: number,
  isAnonymous: boolean,
): { title: string; description: string } | null {
  if (pendingCount > 0) {
    return {
      title: '저장되지 않은 기록이 있어요',
      // 아직 서버에 없는 기록은 로그아웃하면 기기에서 지워져 어디에도 남지 않는다
      description: `아직 저장되지 않은 기록 ${pendingCount}개가 있어요. 로그아웃하면 이 기기에서 사라져요.${
        isAnonymous ? ` ${GUEST_NOTICE}` : ''
      }`,
    };
  }
  if (isAnonymous)
    return { title: '체험을 끝낼까요?', description: GUEST_NOTICE };
  return null;
}

// 설정의 로그아웃 줄.
// 1) 아직 안 보낸 기록을 먼저 보내 본다 2) 그래도 남았으면 "사라져요"라고 묻는다 (CLAUDE.md: 미전송 기록은 먼저 확인)
// 3) 로그아웃이 성공하면 이 기기의 사본·화면 캐시를 지운다. 실패하면(오프라인 등) 지우지 않는다: 보내지 못한 기록이 남아야 한다
// 4) 페이지를 새로 연다(location.replace): TanStack Query 캐시, 토스트(Zustand) 같은 메모리 속 상태가 모두 사라져서,
//    다음에 로그인한 사람에게 앞 사람의 기록이 잠깐이라도 보이는 일이 없다. replace라 뒤로 가기로 돌아오지 않는다
export default function LogoutButton({ isAnonymous }: LogoutButtonProps) {
  const [confirmText, setConfirmText] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const showToast = useToastStore((state) => state.showToast);

  async function logout() {
    setIsPending(true);
    // 세션이 있을 때 지울 사본을 알아 둔다 (로그아웃 뒤에는 어느 계정 것인지 모른다)
    const cleanup = await prepareDeviceDataCleanup();
    const error = await signOut();
    if (error) {
      setIsPending(false);
      setConfirmText(null);
      showToast({
        message: '로그아웃하지 못했어요. 연결을 확인하고 다시 시도해 주세요.',
      });
      return;
    }
    // 지우기에 실패해도 로그아웃은 끝났다: 사본은 계정마다 따로라 다음 사람에게 섞이지 않는다
    await cleanup().catch(() => {});
    window.location.replace(LOGIN_PATH);
  }

  async function start() {
    setIsPending(true);
    // 보내기·세기는 실패해도 로그아웃을 막지 않는다 (세지 못하면 0으로 보고, 묻지 않는다)
    await sendPendingRecords().catch(() => {});
    const pendingCount = await listPendingRecordIds()
      .then((ids) => ids.length)
      .catch(() => 0);
    const text = logoutConfirmText(pendingCount, isAnonymous);
    if (text) {
      setIsPending(false);
      setConfirmText(text);
      return;
    }
    await logout();
  }

  return (
    <>
      <button
        type='button'
        disabled={isPending}
        onClick={() => void start()}
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
        open={confirmText !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmText(null);
        }}
        title={confirmText?.title ?? ''}
        description={confirmText?.description ?? ''}
        confirmLabel='로그아웃'
        confirmVariant='danger'
        onConfirm={() => void logout()}
        isPending={isPending}
      />
    </>
  );
}
