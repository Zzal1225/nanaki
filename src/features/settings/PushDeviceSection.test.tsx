// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PushSupport } from '@/features/push/pushSupport';
import PushDeviceSection from './PushDeviceSection';

// 기기·구독 상태는 가짜로. 이 테스트는 "설정에서 이 기기 알림을 껐다가 다시 켤 수 있는지"와 켤 수 없을 때의 안내를 본다
const state = vi.hoisted(() => ({
  isSubscribed: false,
  support: 'supported' as PushSupport | null,
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}));
vi.mock('@/features/push/api/pushStore', () => ({
  isPushConfigured: () => true,
}));
vi.mock('@/features/push/hooks/usePushSupport', () => ({
  usePushSupport: () => state.support,
}));
vi.mock('@/features/push/hooks/useThisDevicePush', () => ({
  useThisDevicePush: () => ({
    isSubscribed: state.isSubscribed,
    subscribe: state.subscribe,
    unsubscribe: state.unsubscribe,
  }),
}));

const toggle = () => screen.getByRole('switch', { name: /이 기기 루틴 알림/ });

describe('PushDeviceSection (설정 > 이 기기 루틴 알림)', () => {
  beforeEach(() => {
    state.isSubscribed = false;
    state.support = 'supported';
    state.subscribe.mockReset().mockResolvedValue('subscribed');
    state.unsubscribe.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => cleanup());

  // 2026-10-24 사용자: 끄면 버튼이 사라져 다시 켤 수 없었다
  it('받는 중이 아니어도 스위치가 보이고, 켜면 이 기기 알림을 켠다', () => {
    render(<PushDeviceSection />);
    expect(toggle().getAttribute('aria-checked')).toBe('false');
    fireEvent.click(toggle());
    expect(state.subscribe).toHaveBeenCalledTimes(1);
  });

  it('받는 중이면 켜져 있고, 끄면 구독을 지운다', () => {
    state.isSubscribed = true;
    render(<PushDeviceSection />);
    expect(toggle().getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle());
    expect(state.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('아이폰 Safari 탭이면 스위치를 끄고 "홈 화면 앱에서만" 안내', () => {
    state.support = 'needsInstall';
    render(<PushDeviceSection />);
    expect((toggle() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain(
      '홈 화면에 추가한 앱에서만',
    );
  });

  it('권한을 막았어도 받는 중이면 끌 수는 있다', () => {
    state.isSubscribed = true;
    state.support = 'denied';
    render(<PushDeviceSection />);
    expect((toggle() as HTMLButtonElement).disabled).toBe(false);
  });

  it('켰는데 권한을 거절하면 이유를 알린다', async () => {
    state.subscribe.mockResolvedValue('denied');
    render(<PushDeviceSection />);
    fireEvent.click(toggle());
    expect((await screen.findByRole('status')).textContent).toContain(
      '알림이 차단돼 있어요',
    );
  });

  it('기기를 알기 전(서버에서 그릴 때)에는 그리지 않는다', () => {
    state.support = null;
    render(<PushDeviceSection />);
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
