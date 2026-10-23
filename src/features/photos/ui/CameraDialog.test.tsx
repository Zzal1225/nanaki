// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findLatestPhoto } from '../api/photoStore';
import { captureVideoFrame } from '../photoCapture';
import PhotoPickButton from './PhotoPickButton';

// 카메라·캔버스는 jsdom에 없어 가짜로. 이 테스트는 "손가락 기기에서 칸을 누르면 앱 안 카메라 → 찍기 → 사용"의 흐름과
// 카메라를 켜고 끄는 때(전환·닫기)를 본다. 실제 영상·찍힌 구도는 Playwright 가짜 카메라와 아이폰으로 확인한다
const SHOT = vi.hoisted(
  () => new File(['s'], 'front.jpg', { type: 'image/jpeg' }),
);
vi.mock('../photoCapture', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  captureVideoFrame: vi.fn(async () => SHOT),
}));
vi.mock('../api/photoStore', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findLatestPhoto: vi.fn(),
}));

const onPick = vi.fn();
const onError = vi.fn();

type FakeStream = { getTracks: () => { stop: () => void }[]; stop: () => void };

function fakeStream(): FakeStream {
  const stop = vi.fn();
  return { getTracks: () => [{ stop }], stop };
}

let getUserMedia: ReturnType<typeof vi.fn>;

function renderButton() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <PhotoPickButton
        kind='front'
        onPick={onPick}
        onError={onError}
        className=''
      >
        정면 사진
      </PhotoPickButton>
    </QueryClientProvider>,
  );
}

describe('CameraDialog (손가락 기기의 앱 안 카메라)', () => {
  beforeEach(() => {
    onPick.mockReset();
    onError.mockReset();
    window.localStorage.clear();
    vi.mocked(findLatestPhoto).mockResolvedValue(null);
    // 손가락 기기 + 카메라 API
    window.matchMedia = vi.fn((query: string) => ({
      matches: query === '(pointer: coarse)',
    })) as unknown as typeof window.matchMedia;
    getUserMedia = vi.fn(async () => fakeStream());
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    // jsdom의 video는 재생도 크기도 없다
    HTMLMediaElement.prototype.play = vi.fn(async () => undefined);
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
      configurable: true,
      get: () => 1080,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
      configurable: true,
      get: () => 1440,
    });
    URL.createObjectURL = vi.fn(() => 'blob:shot');
    URL.revokeObjectURL = vi.fn();
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    };
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('칸을 누르면 파일 창 대신 후면 카메라를 연다 (거울 전신샷)', async () => {
    renderButton();
    expect(screen.queryByText('정면 사진')?.closest('label')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '정면 사진' }));

    expect(
      await screen.findByRole('heading', { name: '정면 촬영' }),
    ).toBeTruthy();
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({ facingMode: 'environment' }),
        audio: false,
      }),
    );
  });

  it('마지막으로 쓴 카메라를 기억한다', async () => {
    window.localStorage.setItem('nanaki:camera-facing', 'user');
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: '정면 사진' }));
    await waitFor(() =>
      expect(getUserMedia.mock.calls[0]?.[0]).toMatchObject({
        video: { facingMode: 'user' },
      }),
    );
  });

  it('찍고 "사용"을 누르면 찍은 사진을 넘긴다 (자르기 창 없이)', async () => {
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: '정면 사진' }));
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: '찍기' }));
    fireEvent.click(await screen.findByRole('button', { name: '사용' }));

    expect(onPick).toHaveBeenCalledWith(SHOT);
    expect(captureVideoFrame).toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: '정면 사진 맞추기' })).toBe(
      null,
    );
  });

  it('타이머는 끔 → 3초 → 10초 → 끔', async () => {
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: '정면 사진' }));
    const timer = await screen.findByRole('button', { name: '타이머 끔' });
    fireEvent.click(timer);
    expect(screen.getByRole('button', { name: '타이머 3초' })).toBeTruthy();
    fireEvent.click(timer);
    expect(screen.getByRole('button', { name: '타이머 10초' })).toBeTruthy();
    fireEvent.click(timer);
    expect(screen.getByRole('button', { name: '타이머 끔' })).toBeTruthy();
  });

  it('3초 타이머: 셔터를 누르면 3, 2, 1 뒤에 찍는다', async () => {
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: '정면 사진' }));
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole('button', { name: '타이머 끔' }));
      fireEvent.click(screen.getByRole('button', { name: '찍기' }));
      // 큰 숫자는 화면 읽기 프로그램에도 바로 읽힌다 (aria-live). 타이머 버튼의 작은 3과 구분
      expect(document.querySelector('[aria-live]')?.textContent).toBe('3');
      // 타이머 콜백의 상태 바꾸기도 act 안에서 해야 화면에 바로 반영된다
      await act(() => vi.advanceTimersByTimeAsync(1000));
      expect(document.querySelector('[aria-live]')?.textContent).toBe('2');
      expect(screen.getByRole('button', { name: '타이머 취소' })).toBeTruthy();
      await act(() => vi.advanceTimersByTimeAsync(2000));
    } finally {
      vi.useRealTimers();
    }
    expect(await screen.findByRole('button', { name: '사용' })).toBeTruthy();
  });

  it('카메라를 바꾸면 앞 카메라를 끄고 전면을 연다(기억함), 닫으면 끈다', async () => {
    const back = fakeStream();
    const front = fakeStream();
    getUserMedia.mockResolvedValueOnce(back).mockResolvedValueOnce(front);
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: '정면 사진' }));
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: '카메라 전환' }));
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
    expect(back.stop).toHaveBeenCalled();
    expect(getUserMedia.mock.calls[1]?.[0]).toMatchObject({
      video: { facingMode: 'user' },
    });
    expect(window.localStorage.getItem('nanaki:camera-facing')).toBe('user');

    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(front.stop).toHaveBeenCalled());
  });

  it('권한을 거절하면 설정·갤러리 안내, 셔터는 꺼진다', async () => {
    getUserMedia.mockRejectedValue(new DOMException('', 'NotAllowedError'));
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: '정면 사진' }));

    expect((await screen.findByRole('alert')).textContent).toContain('권한');
    expect(
      (screen.getByRole('button', { name: '찍기' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText('갤러리에서 불러오기')).toBeTruthy();
  });
});
