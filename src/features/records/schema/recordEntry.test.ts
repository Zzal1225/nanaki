import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  MAX_MEMO_LENGTH,
  MAX_TAGS,
  MAX_TITLE_LENGTH,
  recordEntrySchema,
  type RecordEntry,
} from './recordEntry';

const VALID_EXPENSE = {
  id: '3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b',
  type: 'expense',
  occurredAt: '2026-10-20',
  title: '점심',
  memo: null,
  tags: ['회사'],
  fields: { amount: 12500, category: '식비', paymentMethod: '카드' },
};

const VALID_REVIEW = {
  ...VALID_EXPENSE,
  type: 'review',
  title: '블루보틀 성수',
  tags: ['재방문'],
  fields: { rating: 4, targetKind: '장소' },
};

function isValid(value: unknown) {
  return recordEntrySchema.safeParse(value).success;
}

describe('recordEntrySchema', () => {
  it('정상 가계부 기록은 통과', () => {
    expect(isValid(VALID_EXPENSE)).toBe(true);
  });
  it('정상 후기 기록은 통과', () => {
    expect(isValid(VALID_REVIEW)).toBe(true);
  });
  // 판별 유니온의 핵심: fields 모양이 맞아도 type과 짝이 안 맞으면 막혀야 한다
  it("type이 'expense'인데 fields가 후기 모양이면 실패", () => {
    expect(isValid({ ...VALID_EXPENSE, fields: VALID_REVIEW.fields })).toBe(
      false,
    );
  });
  it("아직 없는 타입('workout')은 실패", () => {
    expect(isValid({ ...VALID_EXPENSE, type: 'workout' })).toBe(false);
  });
  it("없는 날짜('2026-13-01')는 실패", () => {
    expect(isValid({ ...VALID_EXPENSE, occurredAt: '2026-13-01' })).toBe(false);
  });
  it('날짜 오류는 정한 문구로 나옴', () => {
    const result = recordEntrySchema.safeParse({
      ...VALID_EXPENSE,
      occurredAt: '2026-13-01',
    });
    expect(result.error?.issues[0].message).toBe('날짜 형식이 아니에요');
  });
  it('공백만 있는 제목은 실패', () => {
    expect(isValid({ ...VALID_EXPENSE, title: '   ' })).toBe(false);
  });
  it('제목 상한과 같은 길이는 통과, 넘으면 실패', () => {
    const atMax = '가'.repeat(MAX_TITLE_LENGTH);
    expect(isValid({ ...VALID_EXPENSE, title: atMax })).toBe(true);
    expect(isValid({ ...VALID_EXPENSE, title: `${atMax}가` })).toBe(false);
  });
  it('메모 상한을 넘으면 실패', () => {
    const tooLong = '가'.repeat(MAX_MEMO_LENGTH + 1);
    expect(isValid({ ...VALID_EXPENSE, memo: tooLong })).toBe(false);
  });
  it('태그 개수 상한을 넘으면 실패', () => {
    const tooMany = Array.from({ length: MAX_TAGS + 1 }, (_, i) => `태그${i}`);
    expect(isValid({ ...VALID_EXPENSE, tags: tooMany })).toBe(false);
  });
  // 예전에 공백을 넣어 저장한 태그도 고쳐 저장할 때 한 단어로 (2026-10-22: 태그는 띄어쓰기 없음)
  it('태그 안의 공백은 빼고, 공백만 있는 태그는 실패', () => {
    const parsed = recordEntrySchema.parse({
      ...VALID_EXPENSE,
      tags: [' 출근 길 '],
    });
    expect(parsed.tags).toEqual(['출근길']);
    expect(isValid({ ...VALID_EXPENSE, tags: ['  '] })).toBe(false);
  });
});

describe('RecordEntry 타입', () => {
  it("type === 'expense'로 좁히면 fields.amount가 number", () => {
    const entry = recordEntrySchema.parse(VALID_EXPENSE);
    if (entry.type === 'expense') {
      expectTypeOf(entry.fields.amount).toEqualTypeOf<number>();
    }
    expectTypeOf<RecordEntry['type']>().toEqualTypeOf<
      'expense' | 'review' | 'workout' | 'body' | 'routine'
    >();
  });
});

describe('공통 칸 오류 문구', () => {
  function messages(value: unknown) {
    return recordEntrySchema
      .safeParse(value)
      .error?.issues.map((i) => i.message);
  }

  it('날짜를 비우면 "날짜를 골라 주세요"', () => {
    expect(messages({ ...VALID_EXPENSE, occurredAt: '' })).toContain(
      '날짜를 골라 주세요',
    );
  });
  it('제목을 비우면 "제목을 입력해 주세요"', () => {
    expect(messages({ ...VALID_EXPENSE, title: '' })).toContain(
      '제목을 입력해 주세요',
    );
  });
});
