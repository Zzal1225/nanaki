import { describe, expect, it } from 'vitest';
import { recordEntrySchema } from '../schema/recordEntry';
import { RECORD_TYPE_ORDER } from '../entry/newRecordMenu';
import { buildSampleRecords } from './sampleRecords';

const TODAY = '2026-10-21';
// 오늘 포함 2주
const SAMPLE_WINDOW_START = '2026-10-08';

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

  it('날짜는 오늘부터 2주 안 또는 지난달 1일, 미래 날짜는 없다', () => {
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
      RECORD_TYPE_ORDER.length,
    );
  });

  it('구현된 타입이 모두 들어 있다 (체험에서 모든 화면이 채워지게)', () => {
    const types = new Set(samples.map((sample) => sample.type));
    expect([...types].sort()).toEqual([...RECORD_TYPE_ORDER].sort());
  });

  it('달이 바뀌는 날에도 지난달로 이어서 날짜를 센다', () => {
    const dates = buildSampleRecords('2026-11-02').map((s) => s.occurredAt);
    expect(dates).toContain('2026-11-02');
    expect(dates).toContain('2026-10-20');
  });
});
