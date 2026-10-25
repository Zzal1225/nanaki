import { describe, expect, it } from 'vitest';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import {
  formatNakiSummary,
  formatNakiSummaryParts,
  orderForPreview,
  summarizeNakiResults,
} from './nakiSummary';

const BASE = { memo: null, tags: [], occurredAt: '2026-09-12' };
const LUNCH: RecordEntry = {
  ...BASE,
  id: '1',
  type: 'expense',
  title: '점심',
  fields: { amount: 15000, category: '외식' },
};
const DINNER: RecordEntry = {
  ...LUNCH,
  id: '2',
  occurredAt: '2026-09-21',
  fields: { amount: 31400, category: '외식' },
};
const RUN: RecordEntry = {
  ...BASE,
  id: '3',
  type: 'workout',
  title: '달리기',
  fields: { activity: '달리기', minutes: 30 },
};
const SWIM: RecordEntry = {
  ...RUN,
  id: '4',
  fields: { activity: '수영', minutes: 45, distance: 1.25 },
};
const body = (id: string, occurredAt: string, fields: object): RecordEntry =>
  ({
    ...BASE,
    id,
    occurredAt,
    type: 'body',
    title: '체중',
    fields,
  }) as RecordEntry;
const WEIGHT_HIGH = body('w1', '2026-10-12', { weight: 69.8 });
const WEIGHT_LOW = body('w2', '2026-10-19', { weight: 68.4 });
const WAIST = body('w3', '2026-10-20', { waist: 78 });
const review = (id: string, rating: number): RecordEntry => ({
  ...BASE,
  id,
  type: 'review',
  title: '후기',
  fields: { rating, targetKind: '장소' },
});

const line = (
  entries: RecordEntry[],
  type: Parameters<typeof summarizeNakiResults>[1],
  intent: 'list' | 'sum' | 'count' | 'avg' | 'max' | 'min',
  field: string | null = null,
) => formatNakiSummary(summarizeNakiResults(entries, type, { intent, field }));

describe('나키 답 숫자 한 줄 (짧은 숫자형)', () => {
  it('목록 질문은 예전 그대로: 가계부는 금액 합계, 그 밖에는 건수, 없으면 없다고', () => {
    expect(line([LUNCH, DINNER], 'expense', 'list')).toBe(
      '합계 -46,400원 · 2건',
    );
    expect(line([RUN], 'workout', 'list')).toBe('모두 1건이에요');
    expect(line([], 'expense', 'sum', 'amount')).toBe(
      '이 조건에 맞는 기록이 없어요',
    );
  });

  it('합계·건수: 운동 시간 합계, 몇 번', () => {
    expect(line([RUN, SWIM], 'workout', 'sum', 'minutes')).toBe(
      '합계 75분 · 2건',
    );
    expect(line([RUN, SWIM], 'workout', 'count')).toBe('모두 2건이에요');
  });

  it('평균: 금액은 정수로, 별점은 "평균 별점"과 소수 한 자리', () => {
    expect(line([LUNCH, DINNER], 'expense', 'avg', 'amount')).toBe(
      '평균 -23,200원 · 2건',
    );
    expect(
      line(
        [review('r1', 4), review('r2', 5), review('r3', 4)],
        'review',
        'avg',
        'rating',
      ),
    ).toBe('평균 별점 4.3 · 3건');
  });

  it('최고·최저: 값과 그 기록의 날짜, 그 칸이 없는 기록(허리둘레)은 빼고 센다', () => {
    expect(
      line([WEIGHT_HIGH, WEIGHT_LOW, WAIST], 'body', 'min', 'weight'),
    ).toBe('최저 체중 68.4kg · 10.19 (월)');
    expect(line([LUNCH, DINNER], 'expense', 'max', 'amount')).toBe(
      '최고 금액 -31,400원 · 09.21 (월)',
    );
  });

  it('그 칸에 값이 하나도 없으면 건수로 (거리 없는 운동의 거리 합계)', () => {
    expect(line([RUN], 'workout', 'sum', 'distance')).toBe('모두 1건이에요');
  });

  // 2026-10-25 아이폰 확인: "최저 체중" 답 아래에 눈바디·허리둘레 기록이 섞여 나왔다
  it('숫자를 계산한 답이면 미리 보기도 그 칸에 숫자가 있는 기록만', () => {
    const PHOTO_ONLY = body('p1', '2026-10-20', {});
    const min = summarizeNakiResults(
      [WEIGHT_HIGH, WAIST, PHOTO_ONLY, WEIGHT_LOW],
      'body',
      { intent: 'min', field: 'weight' },
    );
    expect(
      orderForPreview([WEIGHT_HIGH, WAIST, PHOTO_ONLY, WEIGHT_LOW], min).map(
        (e) => e.id,
      ),
    ).toEqual(['w2', 'w1']);
    // 목록 질문(건수)은 거르지 않는다: 체형 기록 전체가 답이다
    const list = summarizeNakiResults([WEIGHT_HIGH, PHOTO_ONLY], 'body');
    expect(
      orderForPreview([WEIGHT_HIGH, PHOTO_ONLY], list).map((e) => e.id),
    ).toEqual(['w1', 'p1']);
  });

  it('최고·최저면 그 기록을 미리 보기 맨 위에, 그 밖에는 순서 그대로', () => {
    const min = summarizeNakiResults([WEIGHT_HIGH, WEIGHT_LOW], 'body', {
      intent: 'min',
      field: 'weight',
    });
    expect(
      orderForPreview([WEIGHT_HIGH, WEIGHT_LOW], min).map((e) => e.id),
    ).toEqual(['w2', 'w1']);
    const sum = summarizeNakiResults([LUNCH, DINNER], 'expense');
    expect(orderForPreview([LUNCH, DINNER], sum).map((e) => e.id)).toEqual([
      '1',
      '2',
    ]);
  });
});

describe('나키 답 두 줄 (이름줄 + 큰 값, 2026-10-24)', () => {
  const parts = (
    entries: RecordEntry[],
    type: Parameters<typeof summarizeNakiResults>[1],
    intent: 'list' | 'sum' | 'count' | 'avg' | 'max' | 'min',
    field: string | null = null,
  ) =>
    formatNakiSummaryParts(
      summarizeNakiResults(entries, type, { intent, field }),
    );

  it('최저 체중: 이름줄에 날짜, 큰 값은 숫자만', () => {
    expect(
      parts([WEIGHT_HIGH, WEIGHT_LOW, WAIST], 'body', 'min', 'weight'),
    ).toEqual({
      label: '최저 체중 · 10.19 (월)',
      value: '68.4kg',
    });
  });
  it('건수, 평균 별점', () => {
    expect(
      parts([review('r1', 4), review('r2', 5)], 'review', 'count'),
    ).toEqual({
      label: '건수',
      value: '2건',
    });
    expect(
      parts([review('r1', 4), review('r2', 5)], 'review', 'avg', 'rating'),
    ).toMatchObject({ label: '평균 별점 · 2건' });
  });
  it('기록이 없으면 두 줄로 나누지 않는다 (문장 그대로)', () => {
    expect(parts([], 'body', 'min', 'weight')).toBeNull();
  });
});
