import { describe, expect, it } from 'vitest';
import type { RecordEntry } from '../schema/recordEntry';
import {
  formatExpenseAmount,
  formatRating,
  getListTitle,
  getListValue,
  getMonthValue,
  getPreviousMonthComparison,
  formatPreviousMonthComparison,
  getDayLabel,
  getDayValue,
  getDetailKicker,
  getHeadlineField,
} from './recordPresentation';

const BASE = {
  occurredAt: '2026-10-19',
  memo: null,
  tags: [],
};

const TAXI: RecordEntry = {
  ...BASE,
  id: '1',
  type: 'expense',
  title: '택시',
  fields: { amount: 7000, category: '교통' },
};
const LUNCH: RecordEntry = {
  ...BASE,
  id: '2',
  type: 'expense',
  title: '점심',
  fields: { amount: 12500, category: '식비', paymentMethod: '카드' },
};
const CAFE: RecordEntry = {
  ...BASE,
  id: '3',
  type: 'review',
  title: '동네 로스터리',
  fields: { rating: 4, targetKind: '장소' },
};

const RUN: RecordEntry = {
  ...BASE,
  id: '4',
  type: 'workout',
  // 제목을 비워 종목 이름이 제목이 된 기록
  title: '러닝',
  fields: { activity: '러닝', minutes: 30, distance: 5.2 },
};
const LEG_DAY: RecordEntry = {
  ...BASE,
  id: '5',
  type: 'workout',
  title: '하체 데이',
  fields: { activity: '헬스', minutes: 60 },
};

const MORNING: RecordEntry = {
  ...BASE,
  id: '6',
  type: 'body',
  occurredAt: '2026-10-19',
  title: '체중 · 허리',
  fields: { weight: 68.4, waist: 78, bodyFat: 18.2 },
};
const EARLIER: RecordEntry = {
  ...BASE,
  id: '7',
  type: 'body',
  occurredAt: '2026-10-12',
  title: '체중',
  fields: { weight: 68.9 },
};

describe('체형 표시', () => {
  it('목록: 제목, 값은 체중', () => {
    expect(getListTitle(MORNING)).toBe('체중 · 허리');
    expect(getListValue(MORNING)).toBe('68.4kg');
  });
  it('이번 달은 가장 늦은 날짜의 체중 (목록 순서와 상관없이), 없으면 —', () => {
    expect(getMonthValue('body', [MORNING, EARLIER])).toBe('68.4kg');
    expect(getMonthValue('body', [TAXI])).toBe('—');
    expect(getHeadlineField('body')).toBe('weight');
  });
  it('하루 요약: 체중과 그다음 적은 항목 하나 (시안: 68.4kg · 허리 78cm)', () => {
    expect(getDayLabel('body', [MORNING])).toBe('체형');
    expect(getDayValue('body', [MORNING])).toBe('68.4kg · 허리 78cm');
    expect(getDayValue('body', [EARLIER])).toBe('68.9kg');
  });
});

describe('운동 표시', () => {
  it('목록: 제목이 종목과 같으면 종목만, 다르면 종목 · 제목, 거리가 있으면 붙인다', () => {
    expect(getListTitle(RUN)).toBe('러닝 5.2km');
    expect(getListTitle(LEG_DAY)).toBe('헬스 · 하체 데이');
    expect(getListValue(LEG_DAY)).toBe('60분');
  });
  it('이번 달은 횟수, 상세 칩은 종목, 크게 보일 값은 시간', () => {
    expect(getMonthValue('workout', [RUN, LEG_DAY, TAXI])).toBe('2회');
    expect(getDetailKicker(LEG_DAY)).toBe('헬스');
    expect(getHeadlineField('workout')).toBe('minutes');
  });
  it('하루 요약: 하나면 종목과 시간, 여럿이면 총 시간', () => {
    expect(getDayLabel('workout', [RUN])).toBe('운동 1회');
    expect(getDayValue('workout', [RUN])).toBe('러닝 30분');
    expect(getDayValue('workout', [RUN, LEG_DAY])).toBe('총 90분');
  });
});

describe('목록 한 줄', () => {
  it('가계부: 제목 · 분류, 값은 마이너스 금액', () => {
    expect(getListTitle(TAXI)).toBe('택시 · 교통');
    expect(getListValue(TAXI)).toBe('-7,000원');
  });
  it('후기: 제목만, 값은 별점', () => {
    expect(getListTitle(CAFE)).toBe('동네 로스터리');
    expect(getListValue(CAFE)).toBe('★ 4.0');
  });
});

describe('이번 달 카드', () => {
  const ENTRIES = [TAXI, LUNCH, CAFE];

  it('가계부는 그 타입 금액만 더한다 (후기는 섞이지 않는다)', () => {
    expect(getMonthValue('expense', ENTRIES)).toBe('-19,500원');
  });
  it('후기는 개수', () => {
    expect(getMonthValue('review', ENTRIES)).toBe('1건');
  });
  it('기록이 없으면 0원 · 0건 (빈 상태에서도 카드는 남긴다)', () => {
    expect(getMonthValue('expense', [])).toBe('0원');
    expect(getMonthValue('review', [])).toBe('0건');
  });
});

describe('표시 형식', () => {
  it('0원에는 마이너스를 붙이지 않는다', () => {
    expect(formatExpenseAmount(0)).toBe('0원');
    expect(formatExpenseAmount(1234567)).toBe('-1,234,567원');
  });
  it('별점은 소수 한 자리', () => {
    expect(formatRating(5)).toBe('★ 5.0');
  });
});

describe('상세 화면', () => {
  it('칩의 두 번째 말: 가계부는 분류, 후기는 대상 종류', () => {
    expect(getDetailKicker(TAXI)).toBe('교통');
    expect(getDetailKicker(CAFE)).toBe('장소');
  });
  it('크게 보여 줄 필드: 가계부는 금액, 후기는 별점', () => {
    expect(getHeadlineField('expense')).toBe('amount');
    expect(getHeadlineField('review')).toBe('rating');
  });
});

describe('하루 요약 한 줄', () => {
  it('가계부: 건수와 그날 합계', () => {
    expect(getDayLabel('expense', [TAXI, LUNCH])).toBe('가계부 2건');
    expect(getDayValue('expense', [TAXI, LUNCH])).toBe('-19,500원');
  });
  it('후기 1건: 대상 이름과 별점', () => {
    expect(getDayLabel('review', [CAFE])).toBe('후기 1건');
    expect(getDayValue('review', [CAFE])).toBe('동네 로스터리 ★ 4.0');
  });
  it('후기 여러 건: 첫 이름 외 N건', () => {
    const BOOK: RecordEntry = { ...CAFE, id: '4', title: '책' };
    expect(getDayValue('review', [CAFE, BOOK])).toBe('동네 로스터리 외 1건');
  });
});

describe('지난달과 비교 (기록 탭 카드)', () => {
  // 카드는 조각을 그리고, 여기서는 한 줄 글자로 바꿔 확인한다 (null은 그대로)
  const text = (...args: Parameters<typeof getPreviousMonthComparison>) => {
    const comparison = getPreviousMonthComparison(...args);
    return comparison && formatPreviousMonthComparison(comparison);
  };

  // 두 목록은 이미 같은 기간으로 잘려 들어온다 (RecordsOverview가 getSamePeriod로 자름)
  const withAmount = (id: string, amount: number): RecordEntry => ({
    ...TAXI,
    id,
    fields: { amount, category: '교통' },
  });

  it('가계부: 금액 차이, 덜/더 썼어요 (금액은 부호 없이)', () => {
    expect(
      text('expense', [withAmount('a', 10000)], [withAmount('b', 22000)]),
    ).toBe('지난달보다 12,000원 덜 썼어요');
    expect(
      text('expense', [withAmount('a', 25000)], [withAmount('b', 22000)]),
    ).toBe('지난달보다 3,000원 더 썼어요');
  });
  it('후기는 건수, 운동은 횟수로 (다른 타입은 섞이지 않는다)', () => {
    expect(text('review', [CAFE, CAFE, TAXI], [CAFE])).toBe(
      '지난달보다 1건 더 썼어요',
    );
    expect(text('workout', [RUN], [RUN, LEG_DAY])).toBe(
      '지난달보다 1회 덜 했어요',
    );
  });
  it('체형: 두 기간 각각의 마지막 체중 차이 (소수 한 자리)', () => {
    const before: RecordEntry = {
      ...EARLIER,
      id: 'p',
      occurredAt: '2026-09-15',
      fields: { weight: 69.2 },
    };
    expect(text('body', [MORNING, EARLIER], [before])).toBe(
      '지난달보다 0.8kg 줄었어요',
    );
  });
  it('같으면 "같아요"', () => {
    expect(text('review', [CAFE], [CAFE])).toBe('지난달과 같아요');
  });
  it('지난달 같은 기간에 그 타입 기록이 없으면 비교하지 않는다 (null)', () => {
    expect(text('expense', [TAXI], [CAFE])).toBeNull();
    // 체형은 이번 기간에 잰 적이 없어도 null (지금 체중을 모른다)
    expect(text('body', [], [MORNING])).toBeNull();
  });
});
