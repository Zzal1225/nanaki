// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchRecords } from '@/features/records/api/recordStore';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import { getUserSettings } from '@/features/settings/api/settingsStore';
import { askNaki, getNakiQuota } from '../api/nakiClient';
import NakiScreen from './NakiScreen';

vi.mock('../api/nakiClient', () => ({
  askNaki: vi.fn(),
  getNakiQuota: vi.fn(),
}));
// 찾기는 검색과 같은 길(기기 사본). 상수(SEARCH_RESULT_LIMIT)는 진짜를 쓴다
vi.mock('@/features/records/api/recordStore', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  searchRecords: vi.fn(),
  listPendingRecordIds: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/features/settings/api/settingsStore', () => ({
  getUserSettings: vi.fn(),
  updateHiddenTypes: vi.fn(),
}));
vi.mock('@/shared/date/useToday', () => ({ useToday: () => '2026-10-23' }));

const BASE = { memo: null, tags: [], occurredAt: '2026-09-12' };
const LUNCH: RecordEntry = {
  ...BASE,
  id: 'lunch',
  type: 'expense',
  title: '점심',
  fields: { amount: 15000, category: '외식' },
};
const DINNER: RecordEntry = {
  ...BASE,
  id: 'dinner',
  type: 'expense',
  title: '저녁',
  fields: { amount: 31400, category: '외식' },
};
const COFFEE: RecordEntry = {
  ...BASE,
  id: 'coffee',
  type: 'expense',
  title: '커피',
  fields: { amount: 4500, category: '카페' },
};

const SEPTEMBER_DINING = {
  keyword: '',
  type: 'expense' as const,
  sort: 'latest' as const,
  period: { kind: 'custom' as const, from: '2026-09-01', to: '2026-09-30' },
  fields: { category: { kind: 'select' as const, values: ['외식'] } },
};

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <NakiScreen />
    </QueryClientProvider>,
  );
}

function askByTyping(question: string) {
  fireEvent.change(screen.getByLabelText('나키에게 물어보기'), {
    target: { value: question },
  });
  fireEvent.click(screen.getByRole('button', { name: '보내기' }));
}

describe('NakiScreen', () => {
  beforeEach(() => {
    vi.mocked(getNakiQuota).mockResolvedValue({
      remaining: 20,
      limit: 20,
      isGuest: false,
    });
    vi.mocked(askNaki).mockReset();
    vi.mocked(searchRecords).mockResolvedValue({
      entries: [LUNCH, DINNER, COFFEE],
      isTruncated: false,
    });
    vi.mocked(getUserSettings).mockResolvedValue({ hiddenTypes: [] });
    // jsdom에는 화면 배치가 없다 (새 답이 붙으면 맨 아래로 스크롤)
    Element.prototype.scrollIntoView = vi.fn();
    // jsdom에는 matchMedia가 없다. "동작 줄이기"로 두어 예시 질문 타이핑 없이 바로 다 보이게 (타이핑은 TypingExamples.test)
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('처음: 안내·예시 질문과 오늘 남은 횟수', async () => {
    renderScreen();
    expect(screen.getByText('기록에 대해 물어보세요')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: '지난달 외식비 얼마였어?' }),
    ).toBeTruthy();
    expect(await screen.findByText(/오늘 20\/20회/)).toBeTruthy();
  });

  it('답: 이해한 조건을 칩으로, 우리가 계산한 한 줄, 기록 탭으로 이어지는 링크', async () => {
    vi.mocked(askNaki).mockResolvedValue({
      kind: 'answer',
      state: SEPTEMBER_DINING,
      remaining: 19,
    });
    renderScreen();
    await screen.findByText(/오늘 20\/20회/);
    askByTyping('지난달 외식비 얼마였어?');

    const chips = await screen.findByRole('list', { name: '찾은 조건' });
    expect(chips.textContent).toContain('타입가계부');
    expect(chips.textContent).toContain('기간2026년 9월');
    expect(chips.textContent).toContain('분류외식');
    // 카페는 조건(분류 외식)에 맞지 않아 빠진다
    expect(await screen.findByText('합계 -46,400원 · 2건')).toBeTruthy();
    const link = screen.getByRole('link', {
      name: /기록 탭에서 이 조건으로 보기/,
    });
    expect(link.getAttribute('href')).toContain('/records/search?');
    expect(link.getAttribute('href')).toContain('category=');
    expect(await screen.findByText(/오늘 19\/20회/)).toBeTruthy();
    // AI에는 질문·오늘·켜진 타입만 간다
    expect(vi.mocked(askNaki).mock.calls[0][0]).toEqual({
      question: '지난달 외식비 얼마였어?',
      today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      types: ['expense', 'review', 'workout', 'body', 'routine'],
    });
  });

  it('이해하지 못하면 탓하지 않고 예시 질문', async () => {
    vi.mocked(askNaki).mockResolvedValue({
      kind: 'answer',
      state: null,
      remaining: 19,
    });
    renderScreen();
    askByTyping('안녕');

    expect(
      await screen.findByText('잘 이해하지 못했어요. 이렇게 물어봐 주세요.'),
    ).toBeTruthy();
    const conversation = screen.getByRole('list', { name: '나키와의 대화' });
    expect(
      within(conversation).getByRole('button', {
        name: '이번 주 운동 몇 번 했어?',
      }),
    ).toBeTruthy();
  });

  it('오늘 횟수를 다 쓰면 알리고 보내기를 막는다', async () => {
    vi.mocked(askNaki).mockResolvedValue({
      kind: 'error',
      error: 'limit',
      remaining: 0,
    });
    renderScreen();
    await screen.findByText(/오늘 20\/20회/);
    askByTyping('이번 주 운동 몇 번 했어?');

    expect(
      await screen.findByText(
        '오늘 질문 횟수를 다 썼어요. 내일 다시 물어봐 주세요.',
      ),
    ).toBeTruthy();
    expect(await screen.findByText(/오늘 0\/20회/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('나키에게 물어보기'), {
      target: { value: '또 물어보기' },
    });
    expect(
      (screen.getByRole('button', { name: '보내기' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('체험 계정이 한도면 로그인을 권하고, 전체 한도·AI 한도면 "쉬어요"', async () => {
    vi.mocked(askNaki)
      .mockResolvedValueOnce({
        kind: 'error',
        error: 'limit',
        remaining: 0,
        isGuest: true,
        userLimit: 10,
      })
      .mockResolvedValueOnce({ kind: 'error', error: 'rest' });
    renderScreen();
    askByTyping('지난달 외식비 얼마였어?');
    expect(
      await screen.findByText(
        '오늘 질문 횟수를 다 썼어요. 구글로 로그인 시 하루 10회까지 사용가능해요.',
      ),
    ).toBeTruthy();

    askByTyping('이번 주 운동 몇 번 했어?');
    expect(
      await screen.findByText('오늘은 나키가 쉬어요, 내일 다시 시도해 주세요'),
    ).toBeTruthy();
  });

  it('예시 질문을 누르면 그 질문을 바로 보낸다', async () => {
    vi.mocked(askNaki).mockResolvedValue({
      kind: 'answer',
      state: null,
      remaining: 19,
    });
    renderScreen();
    fireEvent.click(
      await screen.findByRole('button', { name: '이번 주 운동 몇 번 했어?' }),
    );
    expect(vi.mocked(askNaki).mock.calls[0][0].question).toBe(
      '이번 주 운동 몇 번 했어?',
    );
  });

  it('질문 문장만 AI 제공자에 보낸다는 안내', () => {
    renderScreen();
    expect(
      screen.getByText(
        '질문 문장만 AI 제공자(Google)에 보내요. 기록 내용은 보내지 않아요.',
      ),
    ).toBeTruthy();
  });

  it('오프라인이면 쓸 수 없다고 알리고 검색으로 보낸다', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderScreen();

    expect(screen.getByText('오프라인에서는 나키를 쓸 수 없어요')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: '검색으로 찾기' }).getAttribute('href'),
    ).toBe('/records/search');
    expect(
      (screen.getByLabelText('나키에게 물어보기') as HTMLInputElement).disabled,
    ).toBe(true);
    expect(getNakiQuota).not.toHaveBeenCalled();
  });
});
