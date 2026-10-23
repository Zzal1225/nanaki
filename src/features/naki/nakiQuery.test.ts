import { describe, expect, it } from 'vitest';
import {
  buildNakiInstructions,
  describeTypesForAi,
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
