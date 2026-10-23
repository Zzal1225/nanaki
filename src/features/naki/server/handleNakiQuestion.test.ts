import { describe, expect, it, vi } from 'vitest';
import {
  handleNakiQuestion,
  type NakiQuestionDeps,
} from './handleNakiQuestion';

const BODY = {
  question: '지난달 외식비 얼마였어?',
  today: '2026-10-23',
  types: ['expense', 'review'],
};

function deps(overrides: Partial<NakiQuestionDeps> = {}): NakiQuestionDeps {
  return {
    getUserId: vi.fn().mockResolvedValue('user-1'),
    useQuota: vi.fn().mockResolvedValue(19),
    refundQuota: vi.fn().mockResolvedValue(undefined),
    askModel: vi.fn().mockResolvedValue({
      kind: 'ok',
      output: {
        understood: true,
        type: 'expense',
        from: '2026-09-01',
        to: '2026-09-30',
        keyword: null,
        selects: [{ field: 'category', values: ['외식'] }],
        ranges: [],
        ratingMin: null,
      },
    }),
    ...overrides,
  };
}

describe('나키 질문 처리 (서버)', () => {
  it('정상: 횟수를 쓰고 걸러진 검색 조건과 남은 횟수', async () => {
    const result = await handleNakiQuestion(BODY, deps());
    expect(result).toEqual({
      status: 200,
      body: {
        remaining: 19,
        state: {
          keyword: '',
          type: 'expense',
          sort: 'latest',
          period: { kind: 'custom', from: '2026-09-01', to: '2026-09-30' },
          fields: { category: { kind: 'select', values: ['외식'] } },
        },
      },
    });
  });

  it('AI에는 질문과 켜진 타입의 필드 정의만 간다 (기록 내용 없음)', async () => {
    const d = deps();
    await handleNakiQuestion(BODY, d);
    const { question, instructions } = vi.mocked(d.askModel).mock.calls[0][0];
    expect(question).toBe('지난달 외식비 얼마였어?');
    expect(instructions).toContain('"type":"expense"');
    expect(instructions).toContain('"type":"review"');
    expect(instructions).not.toContain('"type":"workout"');
  });

  it('요청 모양이 틀리면 400, 로그인이 없으면 401 (횟수도 AI도 안 쓴다)', async () => {
    const d = deps();
    expect((await handleNakiQuestion({ question: '' }, d)).status).toBe(400);
    expect(
      (await handleNakiQuestion({ ...BODY, types: ['nope'] }, d)).status,
    ).toBe(400);
    const signedOut = deps({ getUserId: vi.fn().mockResolvedValue(null) });
    expect((await handleNakiQuestion(BODY, signedOut)).status).toBe(401);
    expect(signedOut.useQuota).not.toHaveBeenCalled();
    expect(d.askModel).not.toHaveBeenCalled();
  });

  it('한도면 429이고 AI를 부르지 않는다', async () => {
    const d = deps({ useQuota: vi.fn().mockResolvedValue(-1) });
    expect(await handleNakiQuestion(BODY, d)).toEqual({
      status: 429,
      body: { error: 'limit', remaining: 0 },
    });
    expect(d.askModel).not.toHaveBeenCalled();
  });

  it('AI 제공자 실패면 502이고 횟수를 되돌린다', async () => {
    const d = deps({
      askModel: vi.fn().mockRejectedValue(new Error('timeout')),
    });
    expect(await handleNakiQuestion(BODY, d)).toEqual({
      status: 502,
      body: { error: 'model', remaining: 20 },
    });
    expect(d.refundQuota).toHaveBeenCalledWith('user-1');
  });

  it('형식이 틀린 답·이해 못 함은 state null (횟수는 쓴 것으로)', async () => {
    const d = deps({
      askModel: vi.fn().mockResolvedValue({ kind: 'unreadable' }),
    });
    expect(await handleNakiQuestion(BODY, d)).toEqual({
      status: 200,
      body: { state: null, remaining: 19 },
    });
    expect(d.refundQuota).not.toHaveBeenCalled();
  });
});
