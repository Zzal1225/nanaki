// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listPendingRecordIds,
  sendPendingRecords,
} from '@/features/records/api/recordStore';
import { prepareDeviceDataCleanup } from '@/lib/db/deviceData';
import { signOut } from './authActions';
import LogoutButton, {
  OFFLINE_LOGOUT_MESSAGE,
  logoutConfirmText,
} from './LogoutButton';
import { useToastStore } from '@/shared/toast/toastStore';

vi.mock('@/features/records/api/recordStore', () => ({
  listPendingRecordIds: vi.fn(),
  sendPendingRecords: vi.fn(),
}));
vi.mock('@/lib/db/deviceData', () => ({
  prepareDeviceDataCleanup: vi.fn(),
}));
vi.mock('./authActions', () => ({ signOut: vi.fn() }));

const replace = vi.fn();
const removeDeviceData = vi.fn(async () => {});

beforeEach(() => {
  vi.mocked(sendPendingRecords).mockResolvedValue();
  vi.mocked(listPendingRecordIds).mockResolvedValue([]);
  vi.mocked(prepareDeviceDataCleanup).mockResolvedValue(removeDeviceData);
  vi.mocked(signOut).mockResolvedValue('signedOut');
  vi.stubGlobal('location', { ...window.location, replace });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('로그아웃 확인 문구', () => {
  it('안 보낸 기록이 있으면 개수와 "사라져요" (체험 계정이면 체험 안내도)', () => {
    expect(logoutConfirmText(2, false)?.description).toContain(
      '아직 저장되지 않은 기록 2개',
    );
    expect(logoutConfirmText(1, true)?.description).toContain(
      '다시 들어올 수 없고',
    );
  });
  it('체험 계정은 묻고, 구글 계정이고 안 보낸 기록이 없으면 묻지 않는다', () => {
    expect(logoutConfirmText(0, true)?.title).toBe('체험을 끝낼까요?');
    expect(logoutConfirmText(0, false)).toBeNull();
  });
});

describe('LogoutButton', () => {
  it('먼저 보내 보고, 남은 게 없으면 바로 로그아웃 → 기기 데이터 지우기 → 로그인 화면', async () => {
    render(<LogoutButton isAnonymous={false} />);
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(sendPendingRecords).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
    expect(removeDeviceData).toHaveBeenCalled();
  });

  it('보내도 남은 기록이 있으면 확인 창을 먼저 띄운다', async () => {
    vi.mocked(listPendingRecordIds).mockResolvedValue(['a', 'b']);
    render(<LogoutButton isAnonymous={false} />);
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));

    expect(
      await screen.findByText(/아직 저장되지 않은 기록 2개/),
    ).toBeDefined();
    expect(signOut).not.toHaveBeenCalled();
  });

  // 세션이 남은 실패(서버 오류 등): 보내지 못한 기록이 사라지지 않게 지우지 않는다
  it('로그아웃이 실패하면 기기 데이터를 지우지 않는다', async () => {
    vi.mocked(signOut).mockResolvedValue('failed');
    render(<LogoutButton isAnonymous={false} />);
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));

    await vi.waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(removeDeviceData).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  // 오프라인에서 시작하면 세션만 지워지고 화면이 기록을 읽지 못했다 (2026-10-22 아이폰 확인 9번)
  it('오프라인이면 보내기·로그아웃을 시작하지 않고 안내만 한다', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<LogoutButton isAnonymous={false} />);
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));

    expect(useToastStore.getState().toast?.message).toBe(
      OFFLINE_LOGOUT_MESSAGE,
    );
    expect(sendPendingRecords).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(removeDeviceData).not.toHaveBeenCalled();
    onLine.mockRestore();
  });
});
