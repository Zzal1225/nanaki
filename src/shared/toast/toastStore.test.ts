import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from './toastStore';

describe('useToastStore', () => {
  beforeEach(() => useToastStore.setState({ toast: null }));

  it('showToast로 띄우고 dismissToast로 지운다', () => {
    useToastStore.getState().showToast({ message: '기록을 삭제했어요' });
    expect(useToastStore.getState().toast?.message).toBe('기록을 삭제했어요');

    useToastStore.getState().dismissToast();
    expect(useToastStore.getState().toast).toBeNull();
  });

  it('새 토스트는 이전 것을 바꾸고 번호가 달라진다 (같은 문구도 새로 보이게)', () => {
    const { showToast } = useToastStore.getState();
    showToast({ message: '같은 문구' });
    const firstId = useToastStore.getState().toast?.id;
    showToast({ message: '같은 문구' });
    expect(useToastStore.getState().toast?.id).not.toBe(firstId);
  });

  it('동작 버튼(되돌리기)의 함수를 그대로 들고 있다', () => {
    const onAction = vi.fn();
    useToastStore.getState().showToast({
      message: '기록을 삭제했어요',
      action: { label: '되돌리기', onAction },
    });
    useToastStore.getState().toast?.action?.onAction();
    expect(onAction).toHaveBeenCalled();
  });
});
