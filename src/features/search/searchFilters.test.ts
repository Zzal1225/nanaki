import { describe, expect, it } from 'vitest';
import type { RecordEntry } from '@/features/records/schema/recordEntry';
import {
  applyFieldFilters,
  describeFilters,
  getFilterFields,
  getSelectOptions,
  matchesFieldFilters,
  parseFieldFilters,
  parsePeriod,
  resolvePeriod,
  writeFieldFilters,
  writePeriod,
} from './searchFilters';

const params = (query: string) => new URLSearchParams(query);

const BASE = { occurredAt: '2026-10-19', memo: null, tags: [] };
const COFFEE: RecordEntry = {
  ...BASE,
  id: '1',
  type: 'expense',
  title: '커피',
  fields: { amount: 4500, category: '카페', paymentMethod: '카드' },
};
const GIFT: RecordEntry = {
  ...BASE,
  id: '2',
  type: 'expense',
  title: '꽃',
  fields: { amount: 30000, category: '선물' },
};
const REVIEW: RecordEntry = {
  ...BASE,
  id: '3',
  type: 'review',
  title: '동네 카페',
  fields: { rating: 4, targetKind: '장소' },
};

describe('타입별 필터 칸 (설정 filterFields + 필드 정의 kind)', () => {
  it('가계부: 금액 범위·분류·결제수단, 운동: 종목·시간(거리 없음)', () => {
    expect(
      getFilterFields('expense').map(({ def, kind }) => [def.name, kind]),
    ).toEqual([
      ['amount', 'range'],
      ['category', 'select'],
      ['paymentMethod', 'select'],
    ]);
    expect(getFilterFields('workout').map(({ def }) => def.name)).toEqual([
      'activity',
      'minutes',
    ]);
  });
  it('후기는 별점(n점 이상)·대상, 체형·루틴은 기간만', () => {
    expect(getFilterFields('review').map(({ kind }) => kind)).toEqual([
      'rating',
      'select',
    ]);
    expect(getFilterFields('body')).toEqual([]);
    expect(getFilterFields('routine')).toEqual([]);
  });
});

describe('기간', () => {
  it('미리 정한 기간과 직접 고른 기간을 읽고 다시 쓴다', () => {
    expect(parsePeriod(params('period=last-month'))).toEqual({
      kind: 'preset',
      preset: 'lastMonth',
    });
    const custom = parsePeriod(params('from=2026-10-01&to=2026-10-15'));
    expect(custom).toEqual({
      kind: 'custom',
      from: '2026-10-01',
      to: '2026-10-15',
    });
    const written = new URLSearchParams();
    writePeriod(written, custom);
    expect(written.toString()).toBe('from=2026-10-01&to=2026-10-15');
  });
  it('틀린 날짜는 버리고, 거꾸로 온 범위는 바꿔 끼운다', () => {
    expect(parsePeriod(params('from=2026-02-30&to=2026-03-01'))).toBeNull();
    expect(parsePeriod(params('period=year'))).toBeNull();
    expect(parsePeriod(params('from=2026-10-15&to=2026-10-01'))).toEqual({
      kind: 'custom',
      from: '2026-10-01',
      to: '2026-10-15',
    });
  });
  it('오늘 기준 날짜 범위 (주는 일요일 시작), 오늘을 모르면 null', () => {
    const today = '2026-10-21'; // 수요일
    expect(resolvePeriod({ kind: 'preset', preset: 'week' }, today)).toEqual({
      from: '2026-10-18',
      to: '2026-10-24',
    });
    expect(
      resolvePeriod({ kind: 'preset', preset: 'lastMonth' }, '2026-03-31'),
    ).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(resolvePeriod({ kind: 'preset', preset: 'month' }, null)).toBeNull();
  });
});

describe('칸 필터 주소', () => {
  it('선택은 같은 이름 반복, 범위는 _min·_max, 별점은 _min', () => {
    const filters = parseFieldFilters(
      params('category=식비&category=카페&amount_min=1000&amount_max=5000'),
      'expense',
    );
    expect(filters).toEqual({
      category: { kind: 'select', values: ['식비', '카페'] },
      amount: { kind: 'range', min: 1000, max: 5000 },
    });
    const written = new URLSearchParams();
    writeFieldFilters(written, filters);
    expect(parseFieldFilters(written, 'expense')).toEqual(filters);
    expect(parseFieldFilters(params('rating_min=4'), 'review')).toEqual({
      rating: { kind: 'rating', min: 4 },
    });
  });
  it('타입이 없거나, 그 타입의 칸이 아니거나, 값이 틀리면 버린다', () => {
    expect(parseFieldFilters(params('category=카페'), null)).toEqual({});
    expect(parseFieldFilters(params('category=카페'), 'review')).toEqual({});
    // 고정 선택(대상 종류)은 정해진 선택지만, 별점은 1~5 정수만, 금액은 상한 안의 0 이상만
    expect(
      parseFieldFilters(
        params('targetKind=아무거나&rating_min=9&amount_min=-5'),
        'review',
      ),
    ).toEqual({});
    expect(parseFieldFilters(params('amount_min=-5'), 'expense')).toEqual({});
  });
});

describe('기록 거르기', () => {
  it('선택은 하나라도 맞으면, 범위는 끝 값 포함', () => {
    expect(
      matchesFieldFilters(COFFEE, {
        category: { kind: 'select', values: ['식비', '카페'] },
        amount: { kind: 'range', min: 4500, max: null },
      }),
    ).toBe(true);
    expect(
      matchesFieldFilters(COFFEE, {
        amount: { kind: 'range', min: null, max: 4499 },
      }),
    ).toBe(false);
  });
  it('선택 값은 대소문자·공백을 무시하고 비교한다 (직접 입력한 분류 "Ott"를 나키가 "OTT"로 불러도)', () => {
    const ott: RecordEntry = {
      ...BASE,
      id: '4',
      type: 'expense',
      title: '유튜브',
      fields: { amount: 14900, category: 'Ott' },
    };
    expect(
      matchesFieldFilters(ott, {
        category: { kind: 'select', values: ['OTT'] },
      }),
    ).toBe(true);
    expect(
      matchesFieldFilters(ott, {
        category: { kind: 'select', values: ['o t t'] },
      }),
    ).toBe(true);
    expect(
      matchesFieldFilters(ott, {
        category: { kind: 'select', values: ['OTT구독'] },
      }),
    ).toBe(false);
  });
  it('그 칸이 비어 있는 기록은 그 칸 필터에서 빠진다 (결제수단을 안 쓴 가계부)', () => {
    expect(
      matchesFieldFilters(GIFT, {
        paymentMethod: { kind: 'select', values: ['카드'] },
      }),
    ).toBe(false);
  });
  it('칸 필터는 고른 타입에만 건다 (다른 타입 기록은 남는다)', () => {
    expect(
      applyFieldFilters([COFFEE, GIFT, REVIEW], 'expense', {
        category: { kind: 'select', values: ['선물'] },
      }),
    ).toEqual([GIFT, REVIEW]);
  });
});

describe('선택지와 적용 칩', () => {
  it('기본 선택지 뒤에 결과의 직접 입력값과 이미 고른 값을 더한다', () => {
    const [, category] = getFilterFields('expense');
    const options = getSelectOptions(category.def, [COFFEE, GIFT], ['여행']);
    expect(options.slice(-2)).toEqual(['여행', '선물']);
    expect(options).toContain('식비');
  });
  it('고정 선택은 기본 선택지만', () => {
    const [, targetKind] = getFilterFields('review');
    expect(getSelectOptions(targetKind.def, [REVIEW], [])).toEqual([
      '장소',
      '제품',
      '콘텐츠',
      '경험',
    ]);
  });
  it('칩 문구: 기간 → 칸 순서, 여러 개는 "외 n", 한쪽 범위는 이상·이하', () => {
    expect(
      describeFilters(
        'expense',
        { kind: 'preset', preset: 'month' },
        {
          category: { kind: 'select', values: ['식비', '카페'] },
          amount: { kind: 'range', min: 3000, max: null },
        },
      ),
    ).toEqual([
      { id: 'period', label: '기간', value: '이번 달' },
      { id: 'amount', label: '금액', value: '3,000원 이상' },
      { id: 'category', label: '분류', value: '식비 외 1' },
    ]);
    expect(
      describeFilters(
        null,
        { kind: 'custom', from: '2026-10-01', to: '2026-10-15' },
        {},
      )[0].value,
    ).toBe('10.01 (목) ~ 10.15 (목)');
  });
});
