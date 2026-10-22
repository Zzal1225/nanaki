'use client';

// 'use client' 이유: 연결 이벤트(online)·화면 보임(visibilitychange)을 듣고 브라우저 저장소의 대기열을 보낸다
import { useEffect } from 'react';
import { OUTBOX_FAILED_EVENT } from '../api/recordOutbox';
import {
  hasFailedRecordSends,
  retryFailedRecordSends,
  sendPendingRecords,
} from '../api/recordStore';
import { useToastStore } from '@/shared/toast/toastStore';

// 앱 틀에 하나. 그리는 것은 없고, 대기열(오프라인 작성)을 언제 보낼지와 실패 알림만 맡는다.
// 보내는 때: 앱을 열 때 · 연결이 돌아올 때 · 다른 앱에 갔다가 돌아올 때 (기록을 쓸 때는 recordStore가 바로 보낸다)
export default function OutboxSync() {
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    // 실패는 화면을 멈추지 않는다: 보내기는 다음 기회에 다시 하고, 서버 거절은 이벤트로 따로 알린다
    const send = () => void sendPendingRecords().catch(() => {});
    const sendWhenVisible = () => {
      if (document.visibilityState === 'visible') send();
    };
    // 시안 15b: "저장하지 못했어요 · 다시 시도". 다시 시도해도 거절되면 같은 이벤트로 또 알린다
    const notifyFailure = () =>
      showToast({
        message: '저장하지 못했어요',
        tone: 'error',
        action: {
          label: '다시 시도',
          icon: 'retry',
          onAction: () => void retryFailedRecordSends().catch(() => {}),
        },
      });

    send();
    // 토스트는 5초 뒤 사라진다. 앱을 다시 열었을 때 아직 멈춘 기록이 있으면 다시 알린다
    void hasFailedRecordSends()
      .then((hasFailed) => {
        if (hasFailed) notifyFailure();
      })
      .catch(() => {});

    window.addEventListener('online', send);
    document.addEventListener('visibilitychange', sendWhenVisible);
    window.addEventListener(OUTBOX_FAILED_EVENT, notifyFailure);
    return () => {
      window.removeEventListener('online', send);
      document.removeEventListener('visibilitychange', sendWhenVisible);
      window.removeEventListener(OUTBOX_FAILED_EVENT, notifyFailure);
    };
  }, [showToast]);

  return null;
}
