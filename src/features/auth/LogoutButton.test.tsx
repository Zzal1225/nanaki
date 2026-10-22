// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listPendingRecordIds,
  sendPendingRecords,
} from '@/features/records/api/recordStore';
import { prepareDeviceDataCleanup } from '@/lib/db/deviceData';
import { signOut } from './authActions';
import LogoutButton, { logoutConfirmText } from './LogoutButton';

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
  vi.mocked(signOut).mockResolvedValue(null);
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

  // 오프라인 등: 보내지 못한 기록이 사라지지 않게 지우지 않는다
  it('로그아웃이 실패하면 기기 데이터를 지우지 않는다', async () => {
    vi.mocked(signOut).mockResolvedValue({ message: '오프라인' } as never);
    render(<LogoutButton isAnonymous={false} />);
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));

    await vi.waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(removeDeviceData).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
