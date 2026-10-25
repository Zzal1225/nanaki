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
import { createRecord, deleteRecord } from '@/features/records/api/recordStore';
import { useToastStore } from '@/shared/toast/toastStore';
import { attachNewRecordPhotos } from '../api/attachNewRecordPhotos';
import RecordFormWithPhotos from './RecordFormWithPhotos';

// 기록 저장·사진 붙이기는 가짜로. 이 테스트는 "쓰기 화면에서 고른 사진이 저장 뒤 그 기록에 붙으러 가는지"만 본다
vi.mock('@/features/records/api/recordStore', () => ({
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
  restoreRecord: vi.fn(),
}));
vi.mock('../api/attachNewRecordPhotos', () => ({
  attachNewRecordPhotos: vi.fn(),
}));
// 맞춰 자르기(37c1)의 캔버스 부분은 jsdom에 없어 가짜로: 고른 사진은 자르기 창을 거쳐 CROPPED가 된다
// vi.hoisted: vi.mock은 파일 맨 위로 끌어올려져서, 그 안에서 쓰는 값도 함께 올려야 한다
const CROPPED = vi.hoisted(
  () => new File(['c'], 'front.jpg', { type: 'image/jpeg' }),
);
vi.mock('../photoCrop', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  readImageSize: vi.fn(async () => ({ width: 1200, height: 1600 })),
  renderCroppedPhoto: vi.fn(async () => CROPPED),
}));
vi.mock('../api/photoStore', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findLatestPhoto: vi.fn(async () => null),
}));
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const JPG = new File(['f'], 'front.jpg', { type: 'image/jpeg' });

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RecordFormWithPhotos type='body' kinds={['front', 'side']} />
    </QueryClientProvider>,
  );
}

// 사진 칸의 파일 입력 (label 안에 숨은 input). 칸 이름으로 찾는다
function pickFile(slotText: string | RegExp, file: File) {
  const input = screen
    .getByText(slotText)
    .closest('label')
    ?.querySelector('input[type=file]');
  if (!input) throw new Error('파일 입력을 찾지 못함');
  fireEvent.change(input, { target: { files: [file] } });
}

// 고르고 → 자르기 창에서 완료까지
async function pickAndCrop(slotText: string, file: File) {
  pickFile(slotText, file);
  fireEvent.click(await screen.findByRole('button', { name: '완료' }));
  await screen.findByText(`${slotText} 바꾸기`);
}

function fillWaistAndSave() {
  fireEvent.change(screen.getByLabelText('허리둘레'), {
    target: { value: '78' },
  });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
}

describe('RecordFormWithPhotos (체형 쓰기 + 사진)', () => {
  beforeEach(() => {
    vi.mocked(createRecord).mockReset();
    vi.mocked(createRecord).mockImplementation(async (input) => ({
      ...input,
      id: 'new-id',
    }));
    vi.mocked(attachNewRecordPhotos).mockReset();
    vi.mocked(deleteRecord).mockReset();
    vi.mocked(attachNewRecordPhotos).mockResolvedValue({ status: 'done' });
    replace.mockReset();
    useToastStore.setState({ toast: null });
    // jsdom에는 blob 주소 만들기가 없다
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
    // 자르기 창이 틀 크기를 잴 때 쓴다 (jsdom에 없다)
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

  it('고른 사진을 미리 보여 주고, 저장하면 새 기록 id로 붙이러 간 뒤 이동한다', async () => {
    renderForm();
    await pickAndCrop('정면 사진', JPG);

    fillWaistAndSave();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    // 올리는 것은 원본이 아니라 맞춰 자른 사진
    expect(attachNewRecordPhotos).toHaveBeenCalledWith('new-id', [
      { kind: 'front', file: CROPPED },
    ]);
    expect(useToastStore.getState().toast).toBeNull();
  });

  it('사진을 안 고르면 붙이기를 부르지 않는다', async () => {
    renderForm();
    fillWaistAndSave();
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(attachNewRecordPhotos).not.toHaveBeenCalled();
  });

  it('뺀 사진은 올리지 않고 미리보기 주소를 닫는다', async () => {
    renderForm();
    await pickAndCrop('정면 사진', JPG);
    fireEvent.click(screen.getByRole('button', { name: '정면 사진 빼기' }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    expect(screen.getByText('정면 사진')).toBeTruthy();

    fillWaistAndSave();
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(attachNewRecordPhotos).not.toHaveBeenCalled();
  });

  it('HEIC는 고를 때 바로 안내하고 칸에 넣지 않는다', () => {
    renderForm();
    pickFile('측면 사진', new File(['h'], 'IMG_1.HEIC', { type: '' }));
    expect(screen.getByRole('alert').textContent).toContain('HEIC');
    expect(screen.queryByText('측면 사진 바꾸기')).toBeNull();
  });

  it('사진을 못 올리면 기록은 저장됐다고 알리고 그래도 이동한다', async () => {
    vi.mocked(attachNewRecordPhotos).mockResolvedValue({
      status: 'partial',
      failedKinds: ['front'],
    });
    renderForm();
    await pickAndCrop('정면 사진', JPG);
    fillWaistAndSave();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(useToastStore.getState().toast?.message).toBe(
      '기록은 저장했지만 정면 사진을 올리지 못했어요. 상세에서 다시 붙여 주세요',
    );
  });

  it('오프라인이면 사진을 고를 수 없고 안내한다', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderForm();
    expect(
      screen.getByText('사진은 오프라인 상태에서 저장할 수 없어요.'),
    ).toBeTruthy();
    const input = screen
      .getByText('정면 사진')
      .closest('label')
      ?.querySelector('input');
    expect(input?.disabled).toBe(true);
  });

  // 2026-10-24 사용자 결정: 체중·허리둘레·사진 중 1개 이상
  // 제목은 붙은 사진 종류 (2026-10-25 사용자 요청: 목록의 [눈바디] 대신 [정면 사진])
  it('사진만 골라도 저장된다 (제목 "정면 사진", 숫자 없음)', async () => {
    renderForm();
    await pickAndCrop('정면 사진', JPG);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(vi.mocked(createRecord).mock.calls[0]?.[0]).toMatchObject({
      title: '정면 사진',
      fields: {},
    });
    expect(attachNewRecordPhotos).toHaveBeenCalledWith('new-id', [
      { kind: 'front', file: CROPPED },
    ]);
  });

  it('사진만 있는 기록인데 한 장도 못 올리면 방금 저장한 기록을 지우고 폼에 남는다 (빈 기록 방지)', async () => {
    vi.mocked(attachNewRecordPhotos).mockResolvedValue({
      status: 'notOnServer',
    });
    renderForm();
    await pickAndCrop('정면 사진', JPG);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      '사진을 올리지 못해 저장하지 않았어요',
    );
    // TanStack mutationFn은 두 번째 인자(맥락)도 받아서 첫 인자만 본다
    expect(vi.mocked(deleteRecord).mock.calls[0]?.[0]).toBe('new-id');
    expect(replace).not.toHaveBeenCalled();
  });

  it('숫자가 있으면 사진을 못 올려도 기록은 남긴다', async () => {
    vi.mocked(attachNewRecordPhotos).mockResolvedValue({
      status: 'notOnServer',
    });
    renderForm();
    await pickAndCrop('정면 사진', JPG);
    fillWaistAndSave();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(deleteRecord).not.toHaveBeenCalled();
  });

  it('아무것도 없으면 저장하지 않고 "1개 이상" 안내', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(
      await screen.findByText('체중, 허리둘레, 사진 중 1개 이상 입력해 주세요'),
    ).toBeTruthy();
    expect(createRecord).not.toHaveBeenCalled();
  });

  // 2026-10-24 아이폰 확인: 사진을 올리는 동안 저장 버튼이 다시 눌려 기록이 두 개 생겼다
  it('사진을 올리는 동안 저장 버튼은 로딩이고, 다시 눌러도 기록이 하나만 생긴다', async () => {
    let finishUpload: (value: { status: 'done' }) => void = () => {};
    vi.mocked(attachNewRecordPhotos).mockReturnValue(
      new Promise((resolve) => {
        finishUpload = resolve;
      }),
    );
    renderForm();
    await pickAndCrop('정면 사진', JPG);
    fillWaistAndSave();

    await waitFor(() => expect(attachNewRecordPhotos).toHaveBeenCalled());
    const save = screen.getByRole('button', { name: '저장' });
    expect(save.getAttribute('aria-busy')).toBe('true');
    fireEvent.click(save);
    expect(createRecord).toHaveBeenCalledTimes(1);

    finishUpload({ status: 'done' });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });
});
