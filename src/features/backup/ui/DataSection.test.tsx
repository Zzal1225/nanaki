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
import { countPhotos } from '@/features/photos/api/photoStore';
import { listAllRecordsNewestFirst } from '@/features/records/api/recordStore';
import { exportBackup, importBackup } from '../api/backupStore';
import { buildBackup } from '../backupFile';
import { useToastStore } from '@/shared/toast/toastStore';
import DataSection from './DataSection';

// 결과는 토스트로 띄운다 (2026-10-26 사용자 요청): 토스트 저장소를 본다
const toast = () => useToastStore.getState().toast;

// 저장소는 가짜로. 이 테스트는 "설정 > 데이터"가 무엇을 보여 주고 파일을 어떻게 다루는지만 본다 (계획·형식은 backup.test)
vi.mock('../api/backupStore', () => ({
  exportBackup: vi.fn(),
  importBackup: vi.fn(),
}));
vi.mock('@/features/records/api/recordStore', () => ({
  listAllRecordsNewestFirst: vi.fn(),
}));
vi.mock('@/features/photos/api/photoStore', () => ({
  countPhotos: vi.fn(),
}));

const EMPTY = {
  records: [],
  routines: [],
  budgets: [],
  fixedExpenses: [],
};

function renderSection() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false } },
        })
      }
    >
      <DataSection />
    </QueryClientProvider>,
  );
}

const fileInput = () =>
  screen
    .getByText('백업 파일 불러오기')
    .closest('label')
    ?.querySelector('input') as HTMLInputElement;

describe('설정 > 데이터 (백업)', () => {
  beforeEach(() => {
    useToastStore.setState({ toast: null });
    vi.mocked(listAllRecordsNewestFirst).mockResolvedValue(
      new Array(3).fill(null),
    );
    vi.mocked(countPhotos).mockResolvedValue(2);
    URL.createObjectURL = vi.fn(() => 'blob:backup');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('기록·사진 수와 "사진은 백업에 포함되지 않아요"', async () => {
    renderSection();
    expect(await screen.findByText('기록 3개 · 사진 2장')).toBeTruthy();
    expect(screen.getByText('사진은 백업에 포함되지 않아요')).toBeTruthy();
  });

  it('저장하기: 날짜가 붙은 .json 파일로 내려받는다', async () => {
    vi.mocked(exportBackup).mockResolvedValue(
      buildBackup({ ...EMPTY }, new Date('2026-10-24T03:00:00Z')),
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: /백업 파일 저장하기/ }));
    await waitFor(() =>
      expect(toast()?.message).toBe('기록 0개를 백업 파일로 저장했어요'),
    );
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toMatch(/^nanaki-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('불러오기: 결과를 토스트 한 줄로', async () => {
    vi.mocked(importBackup).mockResolvedValue({
      added: 5,
      skipped: 2,
      invalid: 0,
    });
    renderSection();
    const file = new File(
      [JSON.stringify(buildBackup({ ...EMPTY }, new Date()))],
      'nanaki-backup.json',
      { type: 'application/json' },
    );
    fireEvent.change(fileInput(), { target: { files: [file] } });
    await waitFor(() =>
      expect(toast()?.message).toBe(
        '5개를 더했어요 · 이미 있는 2개는 건너뛰었어요',
      ),
    );
  });

  it('백업 파일이 아니면 불러오지 않고 알린다', async () => {
    renderSection();
    const file = new File(['{"hello":1}'], 'x.json', {
      type: 'application/json',
    });
    fireEvent.change(fileInput(), { target: { files: [file] } });
    await waitFor(() =>
      expect(toast()).toMatchObject({
        message: 'nanaki 백업 파일이 아니에요',
        tone: 'error',
      }),
    );
    expect(importBackup).not.toHaveBeenCalled();
  });

  // 아이폰: 받는 종류가 비면 사진 메뉴가 먼저 뜬다. JSON만 받으면 바로 파일 화면 (2026-10-26 터널로 확인)
  it('불러오기는 JSON만 받는다 (아이폰에서 사진 메뉴 없이 파일 화면)', () => {
    renderSection();
    expect(fileInput().getAttribute('accept')).toBe('application/json,.json');
  });

  it('오프라인이면 저장·불러오기를 막고 안내', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderSection();
    expect(
      (
        screen.getByRole('button', {
          name: /백업 파일 저장하기/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(fileInput().disabled).toBe(true);
    expect(screen.getByText('연결되면 저장하고 불러올 수 있어요')).toBeTruthy();
  });
});
