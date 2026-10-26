import { describe, expect, it } from 'vitest';
import {
  buildNakiInstructions,
  describeTypesForAi,
  toNakiCompare,
  toPreviousConditions,
  toSearchState,
  type NakiAiOutput,
} from './nakiQuery';

const ALL_TYPES = ['expense', 'review', 'workout', 'body', 'routine'] as const;

function output(values: Partial<NakiAiOutput>): NakiAiOutput {
  return {
    understood: true,
    type: null,
    from: null,
    to: null,
    keyword: null,
    selects: [],
    ranges: [],
    ratingMin: null,
    intent: null,
    metric: null,
    ...values,
  };
}

describe('AI 답 → 검색 조건', () => {
  it('"지난달 외식비": 타입·기간·분류', () => {
    expect(
      toSearchState(
        output({
          type: 'expense',
          from: '2026-09-01',
          to: '2026-09-30',
          selects: [{ field: 'category', values: ['외식'] }],
        }),
        ALL_TYPES,
      ),
    ).toEqual({
      keyword: '',
      type: 'expense',
      sort: 'latest',
      period: { kind: 'custom', from: '2026-09-01', to: '2026-09-30' },
      fields: { category: { kind: 'select', values: ['외식'] } },
    });
  });

  it('이해하지 못했거나 남는 조건이 없으면 null', () => {
    expect(toSearchState(output({ understood: false }), ALL_TYPES)).toBeNull();
    expect(toSearchState(output({}), ALL_TYPES)).toBeNull();
  });

  it('믿지 않는다: 꺼진 타입·모르는 타입은 버리고, 그 타입에 없는 칸·다른 연산자는 버린다', () => {
    const state = toSearchState(
      output({
        type: 'expense',
        keyword: '커피',
        selects: [
          { field: 'category', values: ['카페', ' ', '카페'] },
          // 가계부에는 대상(targetKind) 칸이 없다
          { field: 'targetKind', values: ['장소'] },
          // 금액은 숫자 칸이라 선택 조건으로는 받지 않는다
          { field: 'amount', values: ['1000'] },
        ],
        ratingMin: 4,
      }),
      ['expense'],
    );
    expect(state?.fields).toEqual({
      category: { kind: 'select', values: ['카페'] },
    });

    // 설정에서 끈 타입
    const hidden = toSearchState(output({ type: 'review', keyword: '카페' }), [
      'expense',
    ]);
    expect(hidden?.type).toBeNull();
    expect(
      toSearchState(output({ type: 'secret_table' }), ALL_TYPES),
    ).toBeNull();
  });

  it('숫자: 음수·상한 초과는 버리고, 거꾸로 온 범위는 바꿔 끼운다. 별점은 1~5만', () => {
    expect(
      toSearchState(
        output({
          type: 'expense',
          ranges: [{ field: 'amount', min: 50000, max: 10000 }],
        }),
        ALL_TYPES,
      )?.fields,
    ).toEqual({ amount: { kind: 'range', min: 10000, max: 50000 } });
    expect(
      toSearchState(
        output({
          type: 'expense',
          ranges: [{ field: 'amount', min: -5, max: 1e12 }],
        }),
        ALL_TYPES,
      )?.fields,
    ).toEqual({});
    expect(
      toSearchState(output({ type: 'review', ratingMin: 9 }), ALL_TYPES)
        ?.fields,
    ).toEqual({});
    expect(
      toSearchState(output({ type: 'review', ratingMin: 4 }), ALL_TYPES)
        ?.fields,
    ).toEqual({ rating: { kind: 'rating', min: 4 } });
  });

  it('기간: 틀린 날짜는 버리고, 거꾸로 온 기간은 바꿔 끼운다', () => {
    expect(
      toSearchState(
        output({ type: 'workout', from: '2026-02-30', to: '2026-03-01' }),
        ALL_TYPES,
      )?.period,
    ).toBeNull();
    expect(
      toSearchState(
        output({ type: 'workout', from: '2026-10-24', to: '2026-10-18' }),
        ALL_TYPES,
      )?.period,
    ).toEqual({ kind: 'custom', from: '2026-10-18', to: '2026-10-24' });
  });
});

describe('AI에 보낼 것', () => {
  it('사용자가 만든 이름이 없으면: 켜진 타입의 칸 정의와 기본 선택지만 (기록 내용은 없다)', () => {
    const [expense] = describeTypesForAi(['expense']);
    expect(expense.type).toBe('expense');
    expect(expense.fields.map((field) => field.name)).toEqual([
      'amount',
      'category',
      'paymentMethod',
    ]);
    expect(expense.fields[1].options).toContain('식비');
    expect(Object.keys(expense.fields[0])).not.toContain('value');
  });

  it('지시문에 오늘 날짜와 주 시작 요일', () => {
    const text = buildNakiInstructions(
      '2026-10-23',
      describeTypesForAi(['expense']),
    );
    expect(text).toContain('2026. 10. 23 (금)');
    expect(text).toContain('일요일');
    expect(text).not.toContain('사용자 태그');
  });

  it('사용자가 만든 분류 이름은 그 칸의 userOptions로, 태그는 지시문 목록으로 (2026-10-23 사용자 결정)', () => {
    const names = {
      fields: [
        { type: 'expense', field: 'category', values: ['Ott'] },
        // 꺼진 타입·직접 입력이 없는 칸·없는 칸 이름은 무시한다 (요청 값을 믿지 않는다)
        { type: 'workout', field: 'activity', values: ['클라이밍'] },
        { type: 'review', field: 'targetKind', values: ['가짜'] },
        { type: 'expense', field: 'memo', values: ['비밀'] },
      ],
      tags: ['구독'],
    };
    const [expense] = describeTypesForAi(['expense'], names);
    expect(expense.fields[1].userOptions).toEqual(['Ott']);
    expect(expense.fields[2].userOptions).toBeUndefined();
    const text = buildNakiInstructions(
      '2026-10-23',
      describeTypesForAi(['expense', 'review'], names),
      names.tags,
    );
    expect(text).toContain('"userOptions":["Ott"]');
    expect(text).toContain('사용자 태그: ["구독"]');
    expect(text).not.toContain('클라이밍');
    expect(text).not.toContain('가짜');
    expect(text).not.toContain('비밀');
  });
});

// 이어 묻기 (2026-10-26): 앞 조건을 AI 답과 같은 모양으로 되돌린다. 화면이 보낸 값이라 모르는 모양은 뺀다
describe('앞 조건 → AI 모양 (이어 묻기)', () => {
  it('선택·범위·별점·기간·계산을 그대로 옮긴다', () => {
    expect(
      toPreviousConditions({
        question: '별점 4점 이상 후기',
        state: {
          keyword: '파스타',
          type: 'review',
          sort: 'latest',
          period: { kind: 'custom', from: '2026-10-01', to: '2026-10-31' },
          fields: {
            kind: { kind: 'select', values: ['식당'] },
            price: { kind: 'range', min: 10000, max: null },
            rating: { kind: 'rating', min: 4 },
          },
        },
        aggregate: { intent: 'count', field: null },
      }),
    ).toEqual({
      type: 'review',
      from: '2026-10-01',
      to: '2026-10-31',
      keyword: '파스타',
      selects: [{ field: 'kind', values: ['식당'] }],
      ranges: [{ field: 'price', min: 10000, max: null }],
      ratingMin: 4,
      intent: 'count',
      metric: null,
    });
  });

  it('프리셋 기간은 비우고, 모양이 틀린 칸·글자가 아닌 값은 뺀다', () => {
    const result = toPreviousConditions({
      question: '이번 주 지출',
      state: {
        keyword: '',
        type: 'expense',
        sort: 'latest',
        period: { kind: 'preset', preset: 'week' },
        fields: {
          category: { kind: 'select', values: ['식비', 3] },
          junk: 'nope',
          other: { kind: 'unknown' },
        },
      },
      aggregate: { intent: 'list', field: null },
    });
    expect(result.from).toBeNull();
    expect(result.keyword).toBeNull();
    expect(result.selects).toEqual([{ field: 'category', values: ['식비'] }]);
    expect(result.ranges).toEqual([]);
  });
});

// 비교 기간 (2026-10-26): AI가 준 두 번째 기간을 거른다
describe('비교 기간 거르기', () => {
  const OCTOBER = toSearchState(
    output({ type: 'expense', from: '2026-10-01', to: '2026-10-31' }),
    ALL_TYPES,
  );
  const withCompare = (compareFrom: string | null, compareTo: string | null) =>
    output({
      type: 'expense',
      from: '2026-10-01',
      to: '2026-10-31',
      compareFrom,
      compareTo,
    });

  // 10월이 다 지난 뒤 (같은 일수로 자르지 않는다)
  const AFTER = '2026-11-15';

  it('합계·건수·평균·목록이면 두 번째 기간을 돌려준다 (거꾸로 와도 바로잡는다)', () => {
    expect(
      toNakiCompare(
        withCompare('2026-09-01', '2026-09-30'),
        OCTOBER,
        'sum',
        AFTER,
      ),
    ).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(
      toNakiCompare(
        withCompare('2026-09-30', '2026-09-01'),
        OCTOBER,
        'list',
        AFTER,
      ),
    ).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });

  // 2026-10-26 실제 AI 시험: 이번 달은 오늘까지, 지난달은 한 달 전체로 잡았다 → 같은 일수끼리 (getSamePeriod와 같은 규칙)
  it('지금 기간이 진행 중이면 비교 기간도 같은 일수까지만 (말일이 짧으면 말일까지)', () => {
    expect(
      toNakiCompare(
        withCompare('2026-09-01', '2026-09-30'),
        OCTOBER,
        'sum',
        '2026-10-23',
      ),
    ).toEqual({ from: '2026-09-01', to: '2026-09-23' });
    const march = toSearchState(
      output({ type: 'expense', from: '2027-03-01', to: '2027-03-31' }),
      ALL_TYPES,
    );
    expect(
      toNakiCompare(
        output({
          type: 'expense',
          from: '2027-03-01',
          to: '2027-03-31',
          compareFrom: '2027-02-01',
          compareTo: '2027-02-28',
        }),
        march,
        'sum',
        '2027-03-31',
      ),
    ).toEqual({ from: '2027-02-01', to: '2027-02-28' });
  });

  it('최고·최저, 지금 기간 없음·아직 안 옴, 틀린 날짜, 같은 기간이면 비교하지 않는다', () => {
    const valid = withCompare('2026-09-01', '2026-09-30');
    expect(toNakiCompare(valid, OCTOBER, 'max', AFTER)).toBeNull();
    expect(
      toNakiCompare(
        valid,
        toSearchState(output({ type: 'expense' }), ALL_TYPES),
        'sum',
        AFTER,
      ),
    ).toBeNull();
    expect(toNakiCompare(valid, OCTOBER, 'sum', '2026-09-15')).toBeNull();
    expect(
      toNakiCompare(
        withCompare('2026-09-31', '2026-09-30'),
        OCTOBER,
        'sum',
        AFTER,
      ),
    ).toBeNull();
    expect(
      toNakiCompare(withCompare(null, null), OCTOBER, 'sum', AFTER),
    ).toBeNull();
    expect(
      toNakiCompare(
        withCompare('2026-10-01', '2026-10-31'),
        OCTOBER,
        'sum',
        AFTER,
      ),
    ).toBeNull();
  });
});
