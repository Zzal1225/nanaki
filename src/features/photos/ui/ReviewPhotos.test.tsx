// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createRecord,
  listPendingRecordIds,
} from '@/features/records/api/recordStore';
import { attachNewRecordPhotos } from '../api/attachNewRecordPhotos';
import {
  createPhotoUrls,
  listPhotosOfRecord,
  uploadPhoto,
  type Photo,
} from '../api/photoStore';
import RecordFormWithPhotos from './RecordFormWithPhotos';
import RecordGallery from './RecordGallery';
import { newRecordPhotoNotice } from './photoError';

// 후기 사진 (step4 38): 여러 장(최대 5), 원본 비율(자르기 없음). 저장소·업로드는 가짜로
vi.mock('@/features/records/api/recordStore', () => ({
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
  restoreRecord: vi.fn(),
  listPendingRecordIds: vi.fn(),
}));
vi.mock('../api/attachNewRecordPhotos', () => ({
  attachNewRecordPhotos: vi.fn(),
}));
vi.mock('../api/photoStore', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listPhotosOfRecord: vi.fn(),
  createPhotoUrls: vi.fn(),
  uploadPhoto: vi.fn(),
  deletePhoto: vi.fn(),
}));
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const jpg = (name: string) => new File([name], name, { type: 'image/jpeg' });

function withQuery(node: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>,
  );
}

// 갤러리의 "＋" 칸 (label 안 숨은 input). 여러 파일을 한 번에 넣는다
function addFiles(files: File[]) {
  const input = document.querySelector(
    'section[aria-label="사진"] input[type=file]',
  );
  if (!input) throw new Error('파일 입력을 찾지 못함');
  fireEvent.change(input, { target: { files } });
}

let urlCount = 0;

beforeEach(() => {
  urlCount = 0;
  URL.createObjectURL = vi.fn(() => `blob:${++urlCount}`);
  URL.revokeObjectURL = vi.fn();
  // 후기 폼의 칩 줄이 넘침을 잰다 (jsdom에 없다)
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  };
  replace.mockReset();
  vi.mocked(createRecord).mockReset();
  vi.mocked(createRecord).mockImplementation(async (input) => ({
    ...input,
    id: 'new-id',
  }));
  vi.mocked(attachNewRecordPhotos).mockReset();
  vi.mocked(attachNewRecordPhotos).mockResolvedValue({ status: 'done' });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('후기 쓰기 화면의 사진 (최대 5장)', () => {
  function fillReview() {
    fireEvent.change(screen.getByLabelText('제목'), {
      target: { value: '동네 로스터리' },
    });
    fireEvent.click(screen.getByRole('radio', { name: '장소' }));
    fireEvent.click(screen.getByRole('radio', { name: '4점' }));
  }

  it('여러 장을 한 번에 고르면 칸이 늘고, 저장하면 고른 순서대로 붙이러 간다', async () => {
    withQuery(<RecordFormWithPhotos type='review' kinds={['review']} />);
    expect(screen.getByText('(선택 · 최대 5장)')).toBeTruthy();
    const files = [jpg('a.jpg'), jpg('b.jpg')];
    addFiles(files);
    expect(screen.getByRole('img', { name: '고른 사진 2' })).toBeTruthy();

    fillReview();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(attachNewRecordPhotos).toHaveBeenCalledWith('new-id', [
      { kind: 'review', file: files[0] },
      { kind: 'review', file: files[1] },
    ]);
  });

  it('5장을 넘게 고르면 5장까지만 넣고 알린다', () => {
    withQuery(<RecordFormWithPhotos type='review' kinds={['review']} />);
    addFiles(['1', '2', '3', '4', '5', '6', '7'].map((n) => jpg(`${n}.jpg`)));
    expect(screen.getAllByRole('img', { name: /고른 사진/ })).toHaveLength(5);
    expect(screen.getByRole('alert').textContent).toContain('5장까지');
  });

  it('HEIC는 빼고 나머지만 넣는다, 빼기로 하나씩 뺀다', () => {
    withQuery(<RecordFormWithPhotos type='review' kinds={['review']} />);
    addFiles([
      jpg('a.jpg'),
      new File(['h'], 'IMG.HEIC', { type: 'image/heic' }),
    ]);
    expect(screen.getAllByRole('img', { name: /고른 사진/ })).toHaveLength(1);
    expect(screen.getByRole('alert').textContent).toContain('HEIC');
    fireEvent.click(screen.getByRole('button', { name: '사진 1 빼기' }));
    expect(screen.queryAllByRole('img', { name: /고른 사진/ })).toHaveLength(0);
  });
});

describe('후기 상세의 사진 갤러리', () => {
  const photo = (id: string): Photo => ({
    id,
    recordId: 'r1',
    kind: 'review',
    path: `u/${id}.webp`,
    thumbPath: `u/${id}-thumb.webp`,
    width: 1600,
    height: 1200,
  });

  beforeEach(() => {
    vi.mocked(listPendingRecordIds).mockResolvedValue([]);
    vi.mocked(createPhotoUrls).mockResolvedValue(new Map());
    vi.mocked(uploadPhoto).mockReset();
    vi.mocked(uploadPhoto).mockResolvedValue(photo('new'));
  });

  it('사진을 한 줄로 보여 주고, 눌러 열면 바꾸기 없이 지우기만', async () => {
    vi.mocked(listPhotosOfRecord).mockResolvedValue([photo('p1'), photo('p2')]);
    withQuery(
      <RecordGallery recordId='r1' recordDate='2026-10-24' kind='review' />,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: '사진 2 크게 보기' }),
    );
    expect(await screen.findByRole('button', { name: '지우기' })).toBeTruthy();
    expect(screen.queryByText('바꾸기')).toBeNull();
  });

  it('남은 자리만큼만 한 장씩 올린다 (4장 있으면 1장만)', async () => {
    vi.mocked(listPhotosOfRecord).mockResolvedValue(
      ['p1', 'p2', 'p3', 'p4'].map(photo),
    );
    withQuery(
      <RecordGallery recordId='r1' recordDate='2026-10-24' kind='review' />,
    );
    await screen.findByText('사진 4/5');
    addFiles([jpg('a.jpg'), jpg('b.jpg')]);
    await waitFor(() => expect(uploadPhoto).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('alert').textContent).toContain('5장까지');
  });

  it('5장이 차면 더하기 칸이 없다', async () => {
    vi.mocked(listPhotosOfRecord).mockResolvedValue(
      ['p1', 'p2', 'p3', 'p4', 'p5'].map(photo),
    );
    withQuery(
      <RecordGallery recordId='r1' recordDate='2026-10-24' kind='review' />,
    );
    await screen.findByRole('button', { name: '사진 5 크게 보기' });
    expect(document.querySelector('input[type=file]')).toBeNull();
  });
});

describe('사진을 못 올렸을 때 알림 (갤러리는 장수로)', () => {
  it('"사진·사진"이 아니라 "사진 2장"', () => {
    expect(
      newRecordPhotoNotice({
        status: 'partial',
        failedKinds: ['review', 'review'],
      })?.message,
    ).toBe(
      '기록은 저장했지만 사진 2장을 올리지 못했어요. 상세에서 다시 붙여 주세요',
    );
  });
});
