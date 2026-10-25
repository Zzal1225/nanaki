import { describe, expect, it } from 'vitest';
import { recordEntrySchema } from '../schema/recordEntry';
import { RECORD_TYPE_ORDER } from '../entry/newRecordMenu';
import { buildSampleRecords } from './sampleRecords';

const TODAY = '2026-10-21';
// 루틴 체크는 루틴(규칙) id가 있어야 만들 수 있어 sampleRoutines.ts가 따로 만든다
const RECORDS_BUILT_HERE = RECORD_TYPE_ORDER.filter(
  (type) => type !== 'routine',
);
// 오늘 포함 6주 (기본 2주 + 추가분 sampleRecordsMore, 가장 오래된 것이 41일 전)
const SAMPLE_WINDOW_START = '2026-09-10';

describe('buildSampleRecords', () => {
  const samples = buildSampleRecords(TODAY);

  // 저장 직전에 같은 스키마로 다시 검사한다. 예시가 스키마와 어긋나면 체험 시작 때 전부 실패한다
  it('모든 예시가 기록 스키마를 통과한다', () => {
    for (const sample of samples) {
      const result = recordEntrySchema.safeParse({
        ...sample,
        id: crypto.randomUUID(),
      });
      expect(result.success, sample.title).toBe(true);
    }
  });

  it('날짜는 오늘부터 6주 안 또는 지난달 1일, 미래 날짜는 없다', () => {
    for (const sample of samples) {
      expect(sample.occurredAt <= TODAY).toBe(true);
      expect(
        sample.occurredAt >= SAMPLE_WINDOW_START ||
          sample.occurredAt === '2026-09-01',
      ).toBe(true);
    }
    expect(samples.some((sample) => sample.occurredAt === TODAY)).toBe(true);
  });

  // 기록 탭 카드의 "지난달 같은 기간보다"가 체험에서도 보이려면 지난달 같은 기간에 모든 타입이 있어야 한다.
  // 오늘이 1일이어도 "지난달 1일~1일" 안에 들도록 1일에 둔다
  it('지난달 1일에 모든 타입의 기록이 있다 (오늘이 1일이어도)', () => {
    const lastMonthFirst = buildSampleRecords('2026-11-01').filter(
      (sample) => sample.occurredAt === '2026-10-01',
    );
    expect(new Set(lastMonthFirst.map((s) => s.type)).size).toBe(
      RECORDS_BUILT_HERE.length,
    );
  });

  it('구현된 타입이 모두 들어 있다 (체험에서 모든 화면이 채워지게)', () => {
    const types = new Set(samples.map((sample) => sample.type));
    expect([...types].sort()).toEqual([...RECORDS_BUILT_HERE].sort());
  });

  // 2026-10-25 사용자 요청: 면접관이 체험할 때 비슷한 기록만 보이지 않게. 줄면 체험 가치가 떨어지므로 지킨다
  it('다양하다: 90개 안팎, 가계부 분류 10가지 이상(직접 입력 포함)·별점 1~5 모두·운동 종목 8가지 이상', () => {
    expect(samples.length).toBeGreaterThanOrEqual(90);
    const fieldsOf = <T extends string>(type: T) =>
      samples
        .filter((s) => s.type === type)
        .map((s) => s.fields as Record<string, unknown>);
    expect(
      new Set(fieldsOf('expense').map((f) => f.category)).size,
    ).toBeGreaterThanOrEqual(10);
    expect(new Set(fieldsOf('expense').map((f) => f.paymentMethod)).size).toBe(
      4,
    );
    expect(
      [...new Set(fieldsOf('review').map((f) => f.rating))].sort(),
    ).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(fieldsOf('review').map((f) => f.targetKind)).size).toBe(4);
    expect(
      new Set(fieldsOf('workout').map((f) => f.activity)).size,
    ).toBeGreaterThanOrEqual(8);
  });

  // 여러 E2E가 기대하는 값: 오늘은 가계부 2건(점심·택시)뿐, 그 이름으로 찾는 기록은 하나뿐
  it('오늘 기록은 점심·택시 두 건뿐이고, E2E가 하나만 찾는 이름은 겹치지 않는다', () => {
    expect(
      samples
        .filter((s) => s.occurredAt === TODAY)
        .map((s) => s.title)
        .sort(),
    ).toEqual(['점심', '택시']);
    for (const title of ['점심', '아메리카노', '동네 로스터리']) {
      expect(
        samples.filter((s) => s.title === title),
        title,
      ).toHaveLength(1);
    }
    expect(samples.filter((s) => s.memo?.includes('원두'))).toHaveLength(1);
  });

  it('달이 바뀌는 날에도 지난달로 이어서 날짜를 센다', () => {
    const dates = buildSampleRecords('2026-11-02').map((s) => s.occurredAt);
    expect(dates).toContain('2026-11-02');
    expect(dates).toContain('2026-10-20');
  });
});
