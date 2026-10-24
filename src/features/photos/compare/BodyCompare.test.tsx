// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listRecordsOfType } from '@/features/records/api/recordStore';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import {
  createPhotoUrls,
  listPhotoDates,
  type PhotoOnDate,
} from '../api/photoStore';
import BodyCompareLink from './BodyCompareLink';
import BodyCompareScreen from './BodyCompareScreen';

// 서버(사진·계정)와 기기 사본(체형 기록)은 가짜로. 이 테스트는 비교 화면의 동작(손잡이·위치 버튼·날짜 고르기·변화 표)과 입구만 본다
vi.mock('../api/photoStore', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listPhotoDates: vi.fn(),
  createPhotoUrls: vi.fn(),
}));
vi.mock('@/features/records/api/recordStore', () => ({
  listRecordsOfType: vi.fn(),
}));
const user = vi.hoisted(() => ({ isAnonymous: false }));
vi.mock('@/features/auth/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: { email: null, isAnonymous: user.isAnonymous },
  }),
}));
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const photoOn = (date: string, id: string): PhotoOnDate => ({
  date,
  recordId: `r-${id}`,
  photo: {
    id,
    recordId: `r-${id}`,
    kind: 'front',
    path: `u/${id}.webp`,
    thumbPath: `u/${id}-thumb.webp`,
    width: 1200,
    height: 1600,
  },
});

const body = (
  id: string,
  occurredAt: string,
  fields: { weight?: number; waist?: number },
): RecordEntry =>
  ({
    id,
    type: 'body',
    occurredAt,
    title: '체중',
    memo: null,
    tags: [],
    fields,
  }) as RecordEntry;

function renderWithQuery(node: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>,
  );
}

describe('눈바디 비교 화면 (37d)', () => {
  beforeEach(() => {
    user.isAnonymous = false;
    replace.mockReset();
    vi.mocked(listPhotoDates).mockResolvedValue([
      photoOn('2026-09-20', 'a'),
      photoOn('2026-10-05', 'b'),
      photoOn('2026-10-19', 'c'),
    ]);
    vi.mocked(createPhotoUrls).mockResolvedValue(
      new Map([
        ['u/a.webp', 'https://signed.example/a'],
        ['u/c.webp', 'https://signed.example/c'],
      ]),
    );
    vi.mocked(listRecordsOfType).mockResolvedValue([
      body('w1', '2026-09-20', { weight: 69.6, waist: 80 }),
      body('w2', '2026-10-19', { weight: 68.4, waist: 78 }),
    ]);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('날짜가 없으면 처음 사진 → 최근 사진, 두 날짜에 가까운 체중·허리둘레 변화', async () => {
    renderWithQuery(
      <BodyCompareScreen kind='front' fromParam={null} toParam={null} />,
    );
    const slider = await screen.findByRole('slider', { name: '비교 위치' });
    expect(slider.getAttribute('aria-valuenow')).toBe('50');
    expect(screen.getAllByText('09.20').length).toBeGreaterThan(0);
    expect(screen.getAllByText('10.19').length).toBeGreaterThan(0);
    // 모바일 줄과 PC 표가 둘 다 DOM에 있다 (보이는 것은 CSS가 고른다)
    expect(screen.getAllByText('-1.2kg').length).toBeGreaterThan(0);
    expect(screen.getAllByText('-2cm').length).toBeGreaterThan(0);
  });

  it('위치 버튼·방향키로 손잡이를 옮긴다', async () => {
    renderWithQuery(
      <BodyCompareScreen kind='front' fromParam={null} toParam={null} />,
    );
    const slider = await screen.findByRole('slider', { name: '비교 위치' });
    fireEvent.click(screen.getByRole('radio', { name: '09.20만' }));
    expect(slider.getAttribute('aria-valuenow')).toBe('100');
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(slider.getAttribute('aria-valuenow')).toBe('95');
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(slider.getAttribute('aria-valuenow')).toBe('0');
  });

  it('앞 날짜를 고르면 사진이 있는 날짜 목록에서 고르고 주소를 바꾼다', async () => {
    renderWithQuery(
      <BodyCompareScreen kind='front' fromParam={null} toParam={null} />,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: /앞 날짜 .* 바꾸기/ }),
    );
    const sheet = await screen.findByRole('dialog', { name: '앞 날짜' });
    fireEvent.click(within(sheet).getByText(/2026\. 10\. 05/));
    expect(replace).toHaveBeenCalledWith(
      '/body-compare?kind=front&from=2026-10-05&to=2026-10-19',
      { scroll: false },
    );
  });

  it('사진이 2개 날짜 미만이면 안내만', async () => {
    vi.mocked(listPhotoDates).mockResolvedValue([photoOn('2026-10-19', 'c')]);
    renderWithQuery(
      <BodyCompareScreen kind='front' fromParam={null} toParam={null} />,
    );
    expect(
      await screen.findByText(
        '정면 사진이 2개 날짜 이상 있어야 비교할 수 있어요',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('체험 계정이고 사진이 없으면 예시 실루엣으로 동작만', async () => {
    user.isAnonymous = true;
    vi.mocked(listPhotoDates).mockResolvedValue([]);
    renderWithQuery(
      <BodyCompareScreen kind='front' fromParam={null} toParam={null} />,
    );
    expect(
      await screen.findByRole('slider', { name: '비교 위치' }),
    ).toBeTruthy();
    expect(screen.getByText(/체험용 예시 이미지예요/)).toBeTruthy();
  });

  it('오프라인이면 안내만 (사진은 온라인 전용)', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderWithQuery(
      <BodyCompareScreen kind='front' fromParam={null} toParam={null} />,
    );
    expect(screen.getByText('연결되면 눈바디를 비교할 수 있어요')).toBeTruthy();
  });
});

describe('BodyCompareLink (입구)', () => {
  beforeEach(() => {
    user.isAnonymous = false;
    vi.mocked(listPhotoDates).mockImplementation(async (kind) =>
      kind === 'front'
        ? [photoOn('2026-09-20', 'a'), photoOn('2026-10-19', 'c')]
        : [],
    );
  });
  afterEach(() => cleanup());

  it('사진이 2개 날짜 이상인 자세로 비교 화면을 연다', async () => {
    renderWithQuery(<BodyCompareLink label='눈바디 비교' />);
    const link = await screen.findByRole('link', { name: '눈바디 비교' });
    expect(link.getAttribute('href')).toBe('/body-compare?kind=front');
  });

  it('기록 상세에서는 그 기록 날짜를 비교 날짜로 (가장 앞 날짜면 앞쪽에)', async () => {
    renderWithQuery(
      <BodyCompareLink
        recordDate='2026-10-19'
        kinds={['front']}
        label='이 사진 비교하기'
      />,
    );
    expect(
      (
        await screen.findByRole('link', { name: '이 사진 비교하기' })
      ).getAttribute('href'),
    ).toBe('/body-compare?kind=front&to=2026-10-19');
    cleanup();
    renderWithQuery(
      <BodyCompareLink
        recordDate='2026-09-20'
        kinds={['front']}
        label='이 사진 비교하기'
      />,
    );
    expect(
      (
        await screen.findByRole('link', { name: '이 사진 비교하기' })
      ).getAttribute('href'),
    ).toBe('/body-compare?kind=front&from=2026-09-20');
  });

  it('비교할 사진이 없으면 숨긴다', async () => {
    vi.mocked(listPhotoDates).mockResolvedValue([photoOn('2026-10-19', 'c')]);
    renderWithQuery(<BodyCompareLink label='눈바디 비교' />);
    await vi.waitFor(() => expect(listPhotoDates).toHaveBeenCalled());
    expect(screen.queryByRole('link')).toBeNull();
  });
});
