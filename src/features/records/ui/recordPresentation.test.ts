import { describe, expect, it } from 'vitest';
import type { Routine } from '@/features/routines/schema/routine';
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
  title: '러닝',
  fields: { activity: '러닝', minutes: 30, distance: 5.2 },
};
// 예전(제목 칸이 있던 때)에 사용자가 제목을 쓴 기록. 목록은 제목을 쓰지 않는다
const LEG_DAY: RecordEntry = {
  ...BASE,
  id: '5',
  type: 'workout',
  title: '하체 데이',
  fields: { activity: '헬스', minutes: 60 },
};

const WEIGHT: RecordEntry = {
  ...BASE,
  id: '6',
  type: 'body',
  occurredAt: '2026-10-19',
  title: '체중',
  fields: { weight: 68.4 },
};
const WAIST: RecordEntry = {
  ...BASE,
  id: '7',
  type: 'body',
  occurredAt: '2026-10-19',
  title: '허리둘레',
  fields: { waist: 78 },
};
const EARLIER: RecordEntry = {
  ...BASE,
  id: '8',
  type: 'body',
  occurredAt: '2026-10-12',
  title: '체중',
  fields: { weight: 68.9 },
};

describe('목록 제목: "[분류] 제목" (2026-10-22 사용자 결정)', () => {
  it('가계부: [분류] 제목, 값은 마이너스 금액', () => {
    expect(getListTitle(TAXI)).toBe('[교통] 택시');
    expect(getListValue(TAXI)).toBe('-7,000원');
  });
  it('후기: [대상] 제목, 값은 별점', () => {
    expect(getListTitle(CAFE)).toBe('[장소] 동네 로스터리');
    expect(getListValue(CAFE)).toBe('★ 4.0');
  });
  it('운동: [종목] 거리, 거리가 없으면 [종목]만 (예전 제목은 쓰지 않는다)', () => {
    expect(getListTitle(RUN)).toBe('[러닝] 5.2km');
    expect(getListTitle(LEG_DAY)).toBe('[헬스]');
    expect(getListValue(LEG_DAY)).toBe('60분');
  });
  it('체형: [체중] / [허리둘레], 값은 그 항목', () => {
    expect(getListTitle(WEIGHT)).toBe('[체중]');
    expect(getListValue(WEIGHT)).toBe('68.4kg');
    expect(getListTitle(WAIST)).toBe('[허리둘레]');
    expect(getListValue(WAIST)).toBe('78cm');
  });
});

describe('상세 화면: 크게 보여 준 필드 (표에서는 뺀다)', () => {
  it('가계부 금액, 후기 별점, 운동 시간', () => {
    expect(getHeadlineField(TAXI)).toBe('amount');
    expect(getHeadlineField(CAFE)).toBe('rating');
    expect(getHeadlineField(RUN)).toBe('minutes');
  });
  it('체형은 기록마다: 체중 기록이면 체중, 허리둘레 기록이면 허리둘레', () => {
    expect(getHeadlineField(WEIGHT)).toBe('weight');
    expect(getHeadlineField(WAIST)).toBe('waist');
  });
});

describe('이번 달 카드', () => {
  const ENTRIES = [TAXI, LUNCH, CAFE];

  it('가계부는 그 타입 금액만 더한다 (후기는 섞이지 않는다)', () => {
    expect(getMonthValue('expense', ENTRIES)).toBe('-19,500원');
  });
  it('후기는 개수, 운동은 횟수', () => {
    expect(getMonthValue('review', ENTRIES)).toBe('1건');
    expect(getMonthValue('workout', [RUN, LEG_DAY, TAXI])).toBe('2회');
  });
  it('체형은 가장 늦은 체중 (허리둘레 기록은 건너뛴다), 없으면 —', () => {
    expect(getMonthValue('body', [WEIGHT, EARLIER, WAIST])).toBe('68.4kg');
    expect(getMonthValue('body', [WAIST])).toBe('—');
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

describe('하루 요약 한 줄', () => {
  it('가계부: 건수와 그날 합계', () => {
    expect(getDayLabel('expense', [TAXI, LUNCH])).toBe('가계부 2건');
    expect(getDayValue('expense', [TAXI, LUNCH])).toBe('-19,500원');
  });
  it('후기 1건: 대상 이름과 별점, 여러 건: 첫 이름 외 N건', () => {
    expect(getDayLabel('review', [CAFE])).toBe('후기 1건');
    expect(getDayValue('review', [CAFE])).toBe('동네 로스터리 ★ 4.0');
    const BOOK: RecordEntry = { ...CAFE, id: '9', title: '책' };
    expect(getDayValue('review', [CAFE, BOOK])).toBe('동네 로스터리 외 1건');
  });
  it('운동: 하나면 종목과 시간, 여럿이면 총 시간', () => {
    expect(getDayLabel('workout', [RUN])).toBe('운동 1회');
    expect(getDayValue('workout', [RUN])).toBe('러닝 30분');
    expect(getDayValue('workout', [RUN, LEG_DAY])).toBe('총 90분');
  });
  it('체형: 그날 체중과 허리둘레를 한 줄에 (따로 잰 두 기록)', () => {
    expect(getDayLabel('body', [WEIGHT])).toBe('체형');
    expect(getDayValue('body', [WEIGHT, WAIST])).toBe('68.4kg · 허리둘레 78cm');
    expect(getDayValue('body', [EARLIER])).toBe('68.9kg');
    expect(getDayValue('body', [WAIST])).toBe('허리둘레 78cm');
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
  it('체형: 두 기간 각각의 마지막 체중 차이 (허리둘레 기록은 건너뛴다)', () => {
    const before: RecordEntry = {
      ...EARLIER,
      id: 'p',
      occurredAt: '2026-09-15',
      fields: { weight: 69.2 },
    };
    expect(text('body', [WEIGHT, EARLIER, WAIST], [before])).toBe(
      '지난달보다 0.8kg 줄었어요',
    );
  });
  it('같으면 "같아요"', () => {
    expect(text('review', [CAFE], [CAFE])).toBe('지난달과 같아요');
  });
  it('지난달 같은 기간에 그 타입 기록이 없으면 비교하지 않는다 (null)', () => {
    expect(text('expense', [TAXI], [CAFE])).toBeNull();
    // 체형은 이번 기간에 체중을 잰 적이 없어도 null (지금 체중을 모른다)
    expect(text('body', [WAIST], [WEIGHT])).toBeNull();
  });
});

describe('루틴 체크 (기록 탭 카드·목록)', () => {
  const WATER_ROUTINE: Routine = {
    id: '11111111-1111-4111-8111-111111111111',
    name: '물 마시기',
    startDate: '2026-09-01',
    schedule: { kind: 'weekly', days: [0, 1, 2, 3, 4, 5, 6] },
    goal: { kind: 'count', target: 8, unit: '잔' },
    endedOn: null,
    remindAt: null,
  };
  function waterCheck(occurredAt: string, count: number): RecordEntry {
    return {
      ...BASE,
      id: `w-${occurredAt}`,
      type: 'routine',
      occurredAt,
      title: '물 마시기',
      fields: { routineId: WATER_ROUTINE.id, count, target: 8, unit: '잔' },
    };
  }
  // 이번 달 1~4일, 지난달 1~4일 (각 4번 해야 했다)
  const context = {
    routines: [WATER_ROUTINE],
    period: {
      current: { from: '2026-10-01', to: '2026-10-04' },
      previous: { from: '2026-09-01', to: '2026-09-04' },
    },
  };

  it('목록: [루틴 이름], 값은 "5/8잔" (체크형이면 "완료")', () => {
    expect(getListTitle(waterCheck('2026-10-01', 5))).toBe('[물 마시기]');
    expect(getListValue(waterCheck('2026-10-01', 5))).toBe('5/8잔');
    const done: RecordEntry = {
      ...BASE,
      id: 'stretch',
      type: 'routine',
      title: '스트레칭',
      fields: { routineId: WATER_ROUTINE.id, count: 1, target: 1, unit: '' },
    };
    expect(getListValue(done)).toBe('완료');
  });
  it('카드 값은 기간 달성률, 비교는 %p', () => {
    const current = [
      waterCheck('2026-10-01', 8),
      waterCheck('2026-10-02', 8),
      waterCheck('2026-10-03', 8),
      waterCheck('2026-10-04', 5),
    ];
    const previous = [waterCheck('2026-09-01', 8)];
    // 이번 3/4 = 75%, 지난달 1/4 = 25%
    expect(getMonthValue('routine', current, context)).toBe('75%');
    const comparison = getPreviousMonthComparison(
      'routine',
      current,
      previous,
      context,
    );
    expect(comparison && formatPreviousMonthComparison(comparison)).toBe(
      '지난달보다 50%p 높아요',
    );
  });
  it('루틴이 없으면 — (해야 할 날이 없다)', () => {
    expect(
      getMonthValue('routine', [], { routines: [], period: context.period }),
    ).toBe('—');
  });
});
