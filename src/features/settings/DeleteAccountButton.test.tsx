// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteAccount } from '@/features/auth/authActions';
import { useToastStore } from '@/shared/toast/toastStore';
import DeleteAccountButton from './DeleteAccountButton';

// 확인 창의 '백업 파일 먼저 저장하기'가 TanStack Query를 쓴다
function renderButton() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DeleteAccountButton />
    </QueryClientProvider>,
  );
}

vi.mock('@/features/auth/authActions', () => ({ deleteAccount: vi.fn() }));

// jsdom은 페이지 이동(location.replace)을 하지 못해서, 불렸는지만 확인한다
const replace = vi.fn();

function openAndConfirm() {
  fireEvent.click(screen.getByRole('button', { name: '계정 삭제' }));
  const dialog = screen.getByRole('alertdialog');
  fireEvent.click(within(dialog).getByRole('button', { name: '계정 삭제' }));
}

describe('DeleteAccountButton', () => {
  beforeEach(() => {
    vi.mocked(deleteAccount).mockReset();
    replace.mockReset();
    useToastStore.setState({ toast: null });
    vi.stubGlobal('location', { ...window.location, replace });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('확인 창 없이는 지우지 않는다. 취소하면 아무 일도 없다', () => {
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: '계정 삭제' }));

    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('계정을 삭제할까요?')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(deleteAccount).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('확인하면 지우고 로그인 화면을 새로 연다', async () => {
    vi.mocked(deleteAccount).mockResolvedValue('deleted');
    renderButton();

    openAndConfirm();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });

  it('secret 키가 없는 환경이면 안내하고 창을 닫는다', async () => {
    vi.mocked(deleteAccount).mockResolvedValue('unavailable');
    renderButton();

    openAndConfirm();

    await waitFor(() =>
      expect(useToastStore.getState().toast?.message).toBe(
        '지금은 계정을 삭제할 수 없어요. 잠시 후 다시 시도해 주세요.',
      ),
    );
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });
});
