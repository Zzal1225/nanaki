// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RemindInput from './RemindInput';

const subscribe = vi.fn();
vi.mock('@/features/push/hooks/useThisDevicePush', () => ({
  useThisDevicePush: () => ({
    isSubscribed: false,
    subscribe,
    unsubscribe: vi.fn(),
  }),
}));

// 폼 대신 값을 들고 있는 작은 틀 (Controller와 같은 역할)
function Harness({ initial }: { initial: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <>
      <RemindInput value={value} onChange={setValue} />
      <output data-testid='value'>{value ?? 'null'}</output>
    </>
  );
}

describe('RemindInput (루틴 알림)', () => {
  afterEach(() => {
    cleanup();
    subscribe.mockReset();
  });

  it('켜면 오전 9:00으로 시각을 고르고, 이 기기 알림을 켠다(권한을 묻는다)', async () => {
    subscribe.mockResolvedValue('subscribed');
    render(<Harness initial={null} />);
    fireEvent.click(screen.getByRole('switch', { name: /알림/ }));

    expect(screen.getByTestId('value').textContent).toBe('09:00');
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(
      (screen.getByLabelText('알림 시각') as HTMLSelectElement).value,
    ).toBe('09:00');
  });

  it('이 기기에서 못 켜면(아이폰 Safari 탭 등) 이유를 알리고, 시각은 그대로 둔다 (다른 기기로 간다)', async () => {
    subscribe.mockResolvedValue('needsInstall');
    render(<Harness initial={null} />);
    fireEvent.click(screen.getByRole('switch', { name: /알림/ }));

    expect(
      await screen.findByText(
        '아이폰은 홈 화면에 추가한 앱에서만 알림을 받을 수 있어요',
      ),
    ).toBeTruthy();
    expect(screen.getByTestId('value').textContent).toBe('09:00');
  });

  it('끄면 시각을 비우고, 이 기기 구독은 건드리지 않는다', () => {
    render(<Harness initial='21:30' />);
    expect(
      (screen.getByLabelText('알림 시각') as HTMLSelectElement).value,
    ).toBe('21:30');
    fireEvent.click(screen.getByRole('switch', { name: /알림/ }));
    expect(screen.getByTestId('value').textContent).toBe('null');
    expect(subscribe).not.toHaveBeenCalled();
  });

  // 2026-10-24 아이폰 확인: 시각 칸 아래(폼 끝)에 있던 안내가 새 루틴 화면의 저장 줄에 가려 안 보였다
  it('안내는 스위치 바로 아래, 시각 칸보다 위에 나온다', async () => {
    subscribe.mockResolvedValue('needsInstall');
    render(<Harness initial={null} />);
    fireEvent.click(screen.getByRole('switch', { name: /알림/ }));

    // 테스트 틀의 <output>도 role=status라 글자로 찾는다
    const notice = await screen.findByText(/홈 화면에 추가한 앱에서만/);
    const select = screen.getByLabelText('알림 시각');
    expect(
      notice.compareDocumentPosition(select) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
