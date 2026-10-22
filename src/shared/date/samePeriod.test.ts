import { describe, expect, it } from 'vitest';
import { filterInRange, getSamePeriod } from './samePeriod';

describe('getSamePeriod (지난달 같은 기간)', () => {
  it('이번 달: 1일~오늘 vs 지난달 1일~같은 날', () => {
    expect(getSamePeriod('2026-10', '2026-10-22')).toEqual({
      current: { from: '2026-10-01', to: '2026-10-22' },
      previous: { from: '2026-09-01', to: '2026-09-22' },
    });
  });
  it('지난달에 그 날이 없으면 말일까지 (3월 31일 → 2월 28일)', () => {
    expect(getSamePeriod('2027-03', '2027-03-31')?.previous).toEqual({
      from: '2027-02-01',
      to: '2027-02-28',
    });
  });
  it('1월이면 지난해 12월과', () => {
    expect(getSamePeriod('2027-01', '2027-01-05')?.previous).toEqual({
      from: '2026-12-01',
      to: '2026-12-05',
    });
  });
  it('지난 달은 두 달 전체', () => {
    expect(getSamePeriod('2026-09', '2026-10-22')).toEqual({
      current: { from: '2026-09-01', to: '2026-09-30' },
      previous: { from: '2026-08-01', to: '2026-08-31' },
    });
  });
  it('아직 오지 않은 달은 비교하지 않는다', () => {
    expect(getSamePeriod('2026-11', '2026-10-22')).toBeNull();
  });
});

describe('filterInRange', () => {
  it('양 끝을 포함한다', () => {
    const entries = [
      '2026-09-30',
      '2026-10-01',
      '2026-10-22',
      '2026-10-23',
    ].map((occurredAt) => ({ occurredAt }));
    expect(
      filterInRange(entries, { from: '2026-10-01', to: '2026-10-22' }),
    ).toEqual([{ occurredAt: '2026-10-01' }, { occurredAt: '2026-10-22' }]);
  });
});
