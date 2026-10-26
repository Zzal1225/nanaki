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
    getUser: vi.fn().mockResolvedValue({ id: 'user-1', isGuest: false }),
    limits: { user: 10, guest: 3, global: 200 },
    today: '2026-10-24',
    useQuota: vi.fn().mockResolvedValue({ kind: 'ok', remaining: 9 }),
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
        // 34e: 계산 조건도 걸러서 돌려준다
        intent: 'sum',
        metric: 'amount',
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
        compare: null,
        remaining: 9,
        aggregate: { intent: 'sum', field: 'amount' },
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

  it('횟수는 서버의 한국 날짜로, 로그인 계정 10회·체험 계정 3회로 센다', async () => {
    const member = deps();
    await handleNakiQuestion(BODY, member);
    expect(member.useQuota).toHaveBeenCalledWith('user-1', '2026-10-24', 10);

    const guest = deps({
      getUser: vi.fn().mockResolvedValue({ id: 'guest-1', isGuest: true }),
    });
    await handleNakiQuestion(BODY, guest);
    expect(guest.useQuota).toHaveBeenCalledWith('guest-1', '2026-10-24', 3);
  });

  it('AI에는 질문과 켜진 타입의 필드 정의만 간다 (기록 내용 없음), 날짜는 사용자의 오늘', async () => {
    const d = deps();
    await handleNakiQuestion(BODY, d);
    const { question, instructions } = vi.mocked(d.askModel).mock.calls[0][0];
    expect(question).toBe('지난달 외식비 얼마였어?');
    expect(instructions).toContain('"type":"expense"');
    expect(instructions).toContain('"type":"review"');
    expect(instructions).not.toContain('"type":"workout"');
    expect(instructions).toContain('2026. 10. 23');
  });

  // 이어 묻기 (2026-10-26 사용자 결정): 앞 질문 문장과 조건만, 결과 숫자·기록은 없다
  const PREVIOUS = {
    question: '이번 달 식비 얼마야?',
    state: {
      keyword: '',
      type: 'expense',
      sort: 'latest',
      period: { kind: 'custom', from: '2026-10-01', to: '2026-10-31' },
      fields: { category: { kind: 'select', values: ['식비'] } },
    },
    aggregate: { intent: 'sum', field: 'amount' },
  };

  it('이어 묻기: 앞 질문 문장과 조건이 지시문에 들어간다', async () => {
    const d = deps();
    await handleNakiQuestion(
      { ...BODY, question: '그럼 지난달은?', previous: PREVIOUS },
      d,
    );
    const { instructions } = vi.mocked(d.askModel).mock.calls[0][0];
    expect(instructions).toContain('바로 앞 질문: "이번 달 식비 얼마야?"');
    expect(instructions).toContain('"from":"2026-10-01"');
    expect(instructions).toContain(
      '"selects":[{"field":"category","values":["식비"]}]',
    );
    expect(instructions).toContain('"intent":"sum"');
  });

  // 비교 (2026-10-26): AI가 준 두 번째 기간을 거른 뒤 돌려준다
  it('비교 기간: 합계 질문이면 돌려주고, 없으면 null', async () => {
    const base = await deps().askModel({ question: '', instructions: '' });
    if (base.kind !== 'ok') throw new Error('mock');
    const withCompare = deps({
      askModel: vi.fn().mockResolvedValue({
        kind: 'ok',
        output: {
          ...base.output,
          compareFrom: '2026-08-01',
          compareTo: '2026-08-31',
        },
      }),
    });
    const compared = await handleNakiQuestion(BODY, withCompare);
    expect(compared.status === 200 && compared.body.compare).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
    });
    const plain = await handleNakiQuestion(BODY, deps());
    expect(plain.status === 200 && plain.body.compare).toBeNull();
  });

  it('이어 묻기가 없으면 앞 질문 줄도 없다', async () => {
    const d = deps();
    await handleNakiQuestion(BODY, d);
    const { instructions } = vi.mocked(d.askModel).mock.calls[0][0];
    expect(instructions).not.toContain('바로 앞 질문');
  });

  it('앞 조건이 틀리거나 너무 길면 이어 묻기만 버리고 질문은 처리한다', async () => {
    const d = deps();
    const tooLong = {
      ...PREVIOUS,
      state: { ...PREVIOUS.state, keyword: 'x'.repeat(2_000) },
    };
    const result = await handleNakiQuestion({ ...BODY, previous: tooLong }, d);
    expect(result.status).toBe(200);
    const { instructions } = vi.mocked(d.askModel).mock.calls[0][0];
    expect(instructions).not.toContain('바로 앞 질문');
  });

  it('요청 모양이 틀리면 400, 로그인이 없으면 401 (횟수도 AI도 안 쓴다)', async () => {
    const d = deps();
    expect((await handleNakiQuestion({ question: '' }, d)).status).toBe(400);
    expect(
      (await handleNakiQuestion({ ...BODY, types: ['nope'] }, d)).status,
    ).toBe(400);
    const signedOut = deps({ getUser: vi.fn().mockResolvedValue(null) });
    expect((await handleNakiQuestion(BODY, signedOut)).status).toBe(401);
    expect(signedOut.useQuota).not.toHaveBeenCalled();
    expect(d.askModel).not.toHaveBeenCalled();
  });

  it('개인 한도: 체험 계정이면 로그인 계정 한도를 함께 알려 준다 (AI는 부르지 않는다)', async () => {
    const d = deps({
      getUser: vi.fn().mockResolvedValue({ id: 'guest-1', isGuest: true }),
      useQuota: vi.fn().mockResolvedValue({ kind: 'userLimit' }),
    });
    expect(await handleNakiQuestion(BODY, d)).toEqual({
      status: 429,
      body: { error: 'limit', remaining: 0, isGuest: true, userLimit: 10 },
    });
    expect(d.askModel).not.toHaveBeenCalled();
  });

  it('서비스 전체 한도면 "쉬어요" (AI는 부르지 않는다)', async () => {
    const d = deps({
      useQuota: vi.fn().mockResolvedValue({ kind: 'globalLimit' }),
    });
    expect(await handleNakiQuestion(BODY, d)).toEqual({
      status: 429,
      body: { error: 'rest' },
    });
    expect(d.askModel).not.toHaveBeenCalled();
  });

  it('AI 제공자 429도 "쉬어요"이고 횟수를 되돌린다', async () => {
    const d = deps({ askModel: vi.fn().mockResolvedValue({ kind: 'busy' }) });
    expect(await handleNakiQuestion(BODY, d)).toEqual({
      status: 429,
      body: { error: 'rest', remaining: 10 },
    });
    expect(d.refundQuota).toHaveBeenCalledWith('user-1', '2026-10-24');
  });

  it('AI 제공자 장애면 502이고 횟수를 되돌린다', async () => {
    const d = deps({
      askModel: vi.fn().mockRejectedValue(new Error('timeout')),
    });
    expect(await handleNakiQuestion(BODY, d)).toEqual({
      status: 502,
      body: { error: 'model', remaining: 10 },
    });
    expect(d.refundQuota).toHaveBeenCalledWith('user-1', '2026-10-24');
  });

  it('형식이 틀린 답·이해 못 함은 state null (횟수는 쓴 것으로)', async () => {
    const d = deps({
      askModel: vi.fn().mockResolvedValue({ kind: 'unreadable' }),
    });
    expect(await handleNakiQuestion(BODY, d)).toEqual({
      status: 200,
      body: {
        state: null,
        aggregate: { intent: 'list', field: null },
        compare: null,
        remaining: 9,
      },
    });
    expect(d.refundQuota).not.toHaveBeenCalled();
  });
});
