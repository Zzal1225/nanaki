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
import {
  createPhotoUrls,
  findLatestPhoto,
  type Photo,
} from '../api/photoStore';
import { renderCroppedPhoto } from '../photoCrop';
import PhotoPickButton from './PhotoPickButton';

// 캔버스(그림 읽기·자르기)와 Supabase는 가짜로. 이 테스트는 "고르기 → 확인 → 자르기 창 → 결과"의 흐름만 본다
const CROPPED = vi.hoisted(
  () => new File(['c'], 'front.jpg', { type: 'image/jpeg' }),
);
vi.mock('../photoCrop', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  readImageSize: vi.fn(async () => ({ width: 3000, height: 4000 })),
  renderCroppedPhoto: vi.fn(async () => CROPPED),
}));
vi.mock('../api/photoStore', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findLatestPhoto: vi.fn(),
  createPhotoUrls: vi.fn(),
}));

const JPG = new File(['f'], 'front.jpg', { type: 'image/jpeg' });
const HEIC = new File(['h'], 'IMG_1.HEIC', { type: 'image/heic' });

const LATEST: Photo = {
  id: 'p0',
  recordId: 'r0',
  kind: 'front',
  path: 'u/p0.webp',
  thumbPath: 'u/p0-thumb.webp',
  width: 1200,
  height: 1600,
};

const onPick = vi.fn();
const onError = vi.fn();

function renderButton() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <PhotoPickButton
        kind='front'
        basis={{ recordId: 'r1', date: '2026-10-24' }}
        onPick={onPick}
        onError={onError}
        className=''
      >
        정면 사진
      </PhotoPickButton>
    </QueryClientProvider>,
  );
}

function choose(input: Element | null | undefined, file: File) {
  if (!input) throw new Error('파일 입력을 찾지 못함');
  fireEvent.change(input, { target: { files: [file] } });
}

const slotInput = () =>
  screen.getByText('정면 사진').closest('label')?.querySelector('input');

describe('PhotoPickButton (고르기 → 맞춰 자르기)', () => {
  beforeEach(() => {
    onPick.mockReset();
    onError.mockReset();
    vi.mocked(renderCroppedPhoto).mockClear();
    vi.mocked(findLatestPhoto).mockResolvedValue(null);
    URL.createObjectURL = vi.fn(() => 'blob:source');
    URL.revokeObjectURL = vi.fn();
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    };
  });
  afterEach(() => cleanup());

  it('고르면 자르기 창이 열리고, + 로 확대한 값으로 잘라 넘긴다', async () => {
    renderButton();
    choose(slotInput(), JPG);

    expect(
      await screen.findByRole('heading', { name: '정면 사진 맞추기' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '확대 늘리기' }));
    expect(screen.getAllByText('105%').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '완료' }));
    await waitFor(() => expect(onPick).toHaveBeenCalledWith(CROPPED));
    expect(vi.mocked(renderCroppedPhoto).mock.calls[0]?.[1]).toEqual({
      zoom: 1.05,
      offsetX: 0,
      offsetY: 0,
    });
    // 닫히면 미리보기 주소도 닫는다
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:source');
    expect(screen.queryByRole('heading', { name: '정면 사진 맞추기' })).toBe(
      null,
    );
  });

  it('HEIC는 창을 열지 않고 바로 안내한다', () => {
    renderButton();
    choose(slotInput(), HEIC);
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('HEIC'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('같은 자세의 지난 사진이 있으면 날짜 칩과 겹치기 슬라이더를 보여 준다 (지금 기록은 빼고, 그 날짜까지에서 찾는다)', async () => {
    vi.mocked(findLatestPhoto).mockResolvedValue({
      photo: LATEST,
      occurredAt: '2026-10-12',
    });
    vi.mocked(createPhotoUrls).mockResolvedValue(
      new Map([['u/p0.webp', 'https://signed.example/p0']]),
    );
    renderButton();
    choose(slotInput(), JPG);

    expect(await screen.findByText('지난 사진 10.12 겹침')).toBeTruthy();
    // 기준: 지금 기록은 빼고, 그 날짜까지의 기록에서 (2026-10-24 사용자 결정)
    expect(findLatestPhoto).toHaveBeenCalledWith('front', {
      recordId: 'r1',
      date: '2026-10-24',
    });
    expect(await screen.findByRole('slider', { name: '겹치기' })).toBeTruthy();
  });

  it('창 안에서 다시 고른 파일이 안 맞으면 창 안에 알린다 (창 뒤로 숨지 않게)', async () => {
    renderButton();
    choose(slotInput(), JPG);
    await screen.findByRole('heading', { name: '정면 사진 맞추기' });

    const repick = screen
      .getByText('다시 고르기')
      .closest('label')
      ?.querySelector('input');
    choose(repick, HEIC);

    expect((await screen.findByRole('alert')).textContent).toContain('HEIC');
    expect(onError).not.toHaveBeenCalled();
  });
});
