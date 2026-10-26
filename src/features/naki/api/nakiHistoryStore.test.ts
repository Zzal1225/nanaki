import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeLocalDb, openLocalDb } from '@/lib/db/localDb';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { createFakeBrowserClient } from '@/lib/supabase/fakeBrowserClient.testing';
import {
  clearNakiHistory,
  loadNakiHistory,
  MAX_NAKI_HISTORY,
  saveNakiTurn,
} from './nakiHistoryStore';

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

// 테스트마다 다른 계정 → 다른 기기 사본으로 시작한다
let userCount = 0;
let userId = '';
beforeEach(() => {
  userCount += 1;
  userId = `naki-history-user-${userCount}`;
  vi.mocked(createSupabaseBrowserClient).mockReturnValue(
    createFakeBrowserClient(userId).client as never,
  );
});
afterEach(() => closeLocalDb());

const STATE = {
  keyword: '',
  type: 'expense' as const,
  sort: 'latest' as const,
  period: { kind: 'custom' as const, from: '2026-10-01', to: '2026-10-31' },
  fields: { category: { kind: 'select' as const, values: ['식비'] } },
};
const turn = (question: string) => ({
  question,
  state: STATE,
  aggregate: { intent: 'sum' as const, field: 'amount' },
  compare: null,
});

describe('나키 대화 저장 (이 기기에만, 2026-10-26)', () => {
  it('물은 순서대로 저장하고 읽는다 (조건만, 결과는 없다)', async () => {
    await saveNakiTurn(turn('이번 달 식비 얼마야?'));
    await saveNakiTurn({ ...turn('안녕'), state: null });
    const history = await loadNakiHistory();
    expect(history.map((item) => item.question)).toEqual([
      '이번 달 식비 얼마야?',
      '안녕',
    ]);
    expect(history[0]).toMatchObject({
      state: STATE,
      aggregate: { intent: 'sum', field: 'amount' },
      compare: null,
    });
    expect(history[1].state).toBeNull();
  });

  it(`${MAX_NAKI_HISTORY}개를 넘으면 오래된 것부터 지운다`, async () => {
    for (let index = 1; index <= MAX_NAKI_HISTORY + 2; index += 1) {
      await saveNakiTurn(turn(`질문 ${index}`));
    }
    const history = await loadNakiHistory();
    expect(history).toHaveLength(MAX_NAKI_HISTORY);
    expect(history[0].question).toBe('질문 3');
    expect(history.at(-1)?.question).toBe(`질문 ${MAX_NAKI_HISTORY + 2}`);
  });

  it('모양이 틀린 줄(예전 앱이 쓴 것 등)은 빼고 나머지를 보여 준다', async () => {
    await saveNakiTurn(turn('정상'));
    await openLocalDb(userId).nakiTurns.add({
      question: '망가짐',
      state: { nope: true },
      aggregate: null,
      compare: null,
      askedAt: '2026-10-26T00:00:00.000Z',
    });
    expect((await loadNakiHistory()).map((item) => item.question)).toEqual([
      '정상',
    ]);
  });

  it('대화 지우기', async () => {
    await saveNakiTurn(turn('지울 질문'));
    await clearNakiHistory();
    expect(await loadNakiHistory()).toEqual([]);
  });
});
