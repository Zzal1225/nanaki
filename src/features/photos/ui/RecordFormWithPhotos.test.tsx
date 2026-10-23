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
import { createRecord } from '@/features/records/api/recordStore';
import { useToastStore } from '@/shared/toast/toastStore';
import { attachNewRecordPhotos } from '../api/attachNewRecordPhotos';
import RecordFormWithPhotos from './RecordFormWithPhotos';

// 기록 저장·사진 붙이기는 가짜로. 이 테스트는 "쓰기 화면에서 고른 사진이 저장 뒤 그 기록에 붙으러 가는지"만 본다
vi.mock('@/features/records/api/recordStore', () => ({
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
}));
vi.mock('../api/attachNewRecordPhotos', () => ({
  attachNewRecordPhotos: vi.fn(),
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

function fillWaistAndSave() {
  fireEvent.change(screen.getByLabelText('허리둘레 (선택)'), {
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
    vi.mocked(attachNewRecordPhotos).mockResolvedValue({ status: 'done' });
    replace.mockReset();
    useToastStore.setState({ toast: null });
    // jsdom에는 blob 주소 만들기가 없다
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('고른 사진을 미리 보여 주고, 저장하면 새 기록 id로 붙이러 간 뒤 이동한다', async () => {
    renderForm();
    pickFile('정면 사진', JPG);
    expect(screen.getByText('정면 사진 바꾸기')).toBeTruthy();

    fillWaistAndSave();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(attachNewRecordPhotos).toHaveBeenCalledWith('new-id', [
      { kind: 'front', file: JPG },
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
    pickFile('정면 사진', JPG);
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
    pickFile('정면 사진', JPG);
    fillWaistAndSave();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(useToastStore.getState().toast?.message).toBe(
      '기록은 저장했지만 정면 사진을 올리지 못했어요. 상세에서 다시 붙여 주세요',
    );
  });

  it('오프라인이면 사진을 고를 수 없고 안내한다', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderForm();
    expect(screen.getByText(/연결되면 사진을 고를 수 있어요/)).toBeTruthy();
    const input = screen
      .getByText('정면 사진')
      .closest('label')
      ?.querySelector('input');
    expect(input?.disabled).toBe(true);
  });
});
