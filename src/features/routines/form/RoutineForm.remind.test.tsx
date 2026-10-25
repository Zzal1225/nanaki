// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PushSupport } from '@/features/push/pushSupport';
import { useToastStore } from '@/shared/toast/toastStore';
import { createRoutine } from '../api/routineStore';
import RoutineForm from './RoutineForm';

// 푸시를 쓸 수 있는 배포라고 가정하고 "새 루틴은 알림이 켜진 채 시작하고, 저장을 누를 때 권한을 묻는지"만 본다.
// 알림 칸 자체(스위치·안내)는 RemindInput.test, 저장 검사는 RoutineForm.test
const push = vi.hoisted(() => ({
  isSubscribed: false,
  support: 'supported' as PushSupport | null,
  subscribe: vi.fn(),
}));
vi.mock('@/features/push/api/pushStore', () => ({
  isPushConfigured: () => true,
}));
vi.mock('@/features/push/hooks/usePushSupport', () => ({
  usePushSupport: () => push.support,
}));
vi.mock('@/features/push/hooks/useThisDevicePush', () => ({
  useThisDevicePush: () => ({
    isSubscribed: push.isSubscribed,
    isChecking: false,
    subscribe: push.subscribe,
    unsubscribe: vi.fn(),
  }),
}));
vi.mock('../api/routineStore', () => ({
  createRoutine: vi.fn(),
  updateRoutine: vi.fn(),
}));
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

function renderAndSave() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RoutineForm mode='create' today='2026-10-25' doneHref='/' />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByLabelText('이름'), {
    target: { value: '물 마시기' },
  });
}

describe('RoutineForm 알림 기본값 (2026-10-25 사용자 결정)', () => {
  beforeEach(() => {
    push.isSubscribed = false;
    push.support = 'supported';
    push.subscribe.mockReset().mockResolvedValue('subscribed');
    replace.mockReset();
    useToastStore.setState({ toast: null });
    vi.mocked(createRoutine).mockReset();
    vi.mocked(createRoutine).mockImplementation(async (values) => ({
      ...values,
      id: 'new-id',
      endedOn: null,
    }));
  });
  afterEach(() => cleanup());

  it('새 루틴은 알림이 켜져 있고(오전 9:00), 저장할 때 미리 알린다', () => {
    renderAndSave();
    expect(
      screen.getByRole('switch', { name: /알림/ }).getAttribute('aria-checked'),
    ).toBe('true');
    expect(screen.getByRole('status').textContent).toBe(
      '저장하면 이 기기에서 알림을 허용할지 물어요',
    );
  });

  it('저장을 누르면 이 기기 알림을 켜고(권한 묻기), 시각과 함께 저장한다', async () => {
    renderAndSave();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(push.subscribe).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createRoutine).mock.calls[0][0]).toMatchObject({
      remindAt: '09:00',
    });
  });

  it('권한을 거절하면 옮긴 화면에서 토스트로 이유를 알린다', async () => {
    push.subscribe.mockResolvedValue('denied');
    renderAndSave();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(useToastStore.getState().toast?.message).toContain(
        '알림이 차단돼 있어요',
      ),
    );
  });

  it('이미 받는 기기면 다시 묻지 않는다', async () => {
    push.isSubscribed = true;
    renderAndSave();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(push.subscribe).not.toHaveBeenCalled();
  });

  it('이 기기에서 받을 수 없으면(아이폰 Safari 탭) 묻지 않고 시각만 저장한다', async () => {
    push.support = 'needsInstall';
    renderAndSave();
    expect(screen.getByRole('status').textContent).toContain(
      '홈 화면에 추가한 앱에서만',
    );
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(push.subscribe).not.toHaveBeenCalled();
    expect(vi.mocked(createRoutine).mock.calls[0][0]).toMatchObject({
      remindAt: '09:00',
    });
  });

  it('알림을 끄고 저장하면 묻지 않는다', async () => {
    renderAndSave();
    fireEvent.click(screen.getByRole('switch', { name: /알림/ }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(push.subscribe).not.toHaveBeenCalled();
    expect(vi.mocked(createRoutine).mock.calls[0][0]).toMatchObject({
      remindAt: null,
    });
  });
});
