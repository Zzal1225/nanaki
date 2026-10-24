// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listPendingRecordIds } from '@/features/records/api/recordStore';
import {
  createPhotoUrls,
  deletePhoto,
  listPhotosOfRecord,
  uploadPhoto,
  type Photo,
} from '../api/photoStore';
import RecordPhotos from './RecordPhotos';

vi.mock('@/features/records/api/recordStore', () => ({
  listPendingRecordIds: vi.fn(),
}));
// 저장소만 가짜로: 형식 확인(PhotoInputError)은 진짜 모듈 것을 쓴다
vi.mock('../api/photoStore', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listPhotosOfRecord: vi.fn(),
  createPhotoUrls: vi.fn(),
  uploadPhoto: vi.fn(),
  deletePhoto: vi.fn(),
}));

const FRONT: Photo = {
  id: 'p1',
  recordId: 'r1',
  kind: 'front',
  path: 'u/p1.webp',
  thumbPath: 'u/p1-thumb.webp',
  width: 1200,
  height: 1600,
};

function renderPhotos() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RecordPhotos
        recordId='r1'
        recordDate='2026-10-24'
        kinds={['front', 'side']}
      />
    </QueryClientProvider>,
  );
}

describe('RecordPhotos (눈바디 사진 칸)', () => {
  beforeEach(() => {
    vi.mocked(listPendingRecordIds).mockResolvedValue([]);
    vi.mocked(listPhotosOfRecord).mockResolvedValue([FRONT]);
    vi.mocked(createPhotoUrls).mockResolvedValue(
      new Map([['u/p1-thumb.webp', 'https://signed.example/thumb']]),
    );
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('있는 사진은 썸네일(서명 링크), 없는 칸은 "측면 사진" 불러오기', async () => {
    renderPhotos();
    const thumb = await screen.findByRole('button', {
      name: '정면 사진 크게 보기',
    });
    await vi.waitFor(() =>
      expect(thumb.querySelector('img')?.getAttribute('src')).toBe(
        'https://signed.example/thumb',
      ),
    );
    expect(screen.getByText('측면 사진')).toBeTruthy();
  });

  it('오프라인이면 사진을 묻지 않고 안내만', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderPhotos();
    expect(screen.getByText('연결되면 사진을 볼 수 있어요')).toBeTruthy();
    expect(listPhotosOfRecord).not.toHaveBeenCalled();
  });

  it('아직 서버에 없는 기록(대기열)이면 붙일 수 없다고 안내', async () => {
    vi.mocked(listPendingRecordIds).mockResolvedValue(['r1']);
    renderPhotos();
    expect(
      await screen.findByText('기록이 저장되면 사진을 붙일 수 있어요'),
    ).toBeTruthy();
  });

  it('HEIC를 고르면 올리지 않고 바꾸는 방법을 안내 (저장소의 형식 확인)', async () => {
    vi.mocked(uploadPhoto).mockImplementation(async (input) => {
      const actual =
        await vi.importActual<typeof import('../api/photoStore')>(
          '../api/photoStore',
        );
      throw new actual.PhotoInputError(`${input.file.name}는 HEIC`);
    });
    renderPhotos();
    await screen.findByText('측면 사진');
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(['x'], 'IMG_1.HEIC', { type: 'image/heic' })],
      },
    });
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('HEIC');
  });

  it('사진만 있는 기록의 마지막 사진을 지우면 "이 기록이 삭제돼요" 확인 → 사진을 지운 뒤 기록도 지운다', async () => {
    vi.mocked(deletePhoto).mockResolvedValue(undefined);
    const onRecordEmptied = vi.fn(async () => undefined);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <RecordPhotos
          recordId='r1'
          recordDate='2026-10-24'
          kinds={['front', 'side']}
          isPhotoOnly
          onRecordEmptied={onRecordEmptied}
        />
      </QueryClientProvider>,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: '정면 사진 크게 보기' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: '지우기' }));
    expect(
      await screen.findByRole('heading', { name: '이 기록이 삭제돼요' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '기록 삭제' }));

    await vi.waitFor(() => expect(onRecordEmptied).toHaveBeenCalled());
    expect(deletePhoto).toHaveBeenCalled();
    // 사진 지우기가 먼저 (실패하면 기록은 그대로)
    expect(vi.mocked(deletePhoto).mock.invocationCallOrder[0]).toBeLessThan(
      onRecordEmptied.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('숫자가 있는 기록이면 평소처럼 "사진을 지울까요?"', async () => {
    renderPhotos();
    fireEvent.click(
      await screen.findByRole('button', { name: '정면 사진 크게 보기' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: '지우기' }));
    expect(
      await screen.findByRole('heading', { name: '사진을 지울까요?' }),
    ).toBeTruthy();
  });
});
