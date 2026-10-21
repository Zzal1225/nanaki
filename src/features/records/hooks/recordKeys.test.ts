import { describe, expect, it } from 'vitest';
import { recordKeys } from './recordKeys';

describe('recordKeys', () => {
  it("목록 키는 'records'로 시작한다 (['records']로 무효화하면 함께 무효화되도록)", () => {
    expect(recordKeys.list('2026-10-01', '2026-10-31').slice(0, 1)).toEqual(
      recordKeys.all,
    );
  });
  it('기간이 다르면 키도 다르다 (기간별로 따로 캐시)', () => {
    expect(recordKeys.list('2026-10-01', '2026-10-31')).not.toEqual(
      recordKeys.list('2026-11-01', '2026-11-30'),
    );
  });
  it('모양은 [records, list, from, to]', () => {
    expect(recordKeys.list('2026-10-01', '2026-10-31')).toEqual([
      'records',
      'list',
      '2026-10-01',
      '2026-10-31',
    ]);
  });
});
