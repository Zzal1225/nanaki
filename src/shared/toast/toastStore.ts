import { create } from 'zustand';

export type ToastAction = {
  label: string;
  onAction: () => void;
  // 버튼 아이콘. 기본은 되돌리기(삭제 토스트). 다시 시도(저장 실패, 시안 15b)는 retry
  icon?: 'undo' | 'retry';
};

export type Toast = {
  // 같은 문구를 연달아 띄워도 새 토스트로 보이게(타이머 다시 시작) 하는 번호
  id: number;
  message: string;
  action?: ToastAction;
  // 실패 알림은 앞에 경고 아이콘을 붙인다 (시안 15b). 색만으로 구분하지 않는다
  tone?: 'error';
  // 기본(5초)보다 오래 보여야 하는 안내만. 읽고 다른 앱(파일 앱)에서 할 일을 알려 주는 글처럼 길 때
  durationMs?: number;
};

type ToastState = {
  toast: Toast | null;
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: () => void;
};

let nextToastId = 0;

// 토스트는 화면을 옮겨 가도 남아야 한다 (상세에서 삭제 → 홈으로 이동 → 홈에서 토스트).
// 컴포넌트 상태는 화면이 바뀌면 사라져서, 화면 밖에 사는 Zustand 저장소에 둔다.
// 주소에 둘 필요는 없는 잠깐의 화면 상태라 URL이 아니라 Zustand (CLAUDE.md: 화면 안에서만 쓰는 상태)
// 한 번에 하나만 보여 준다. 새 토스트가 오면 이전 것을 바꾼다 (시안: 토스트 한 줄)
export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  showToast: (toast) => set({ toast: { ...toast, id: ++nextToastId } }),
  dismissToast: () => set({ toast: null }),
}));
