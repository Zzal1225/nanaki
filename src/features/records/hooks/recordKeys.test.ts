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

describe('recordKeys.recent', () => {
  it("최근 기록 키도 'records'로 시작한다 (저장 후 무효화에 포함)", () => {
    expect(recordKeys.recent(20).slice(0, 1)).toEqual(recordKeys.all);
  });
  it('기간 목록 키와 겹치지 않는다', () => {
    expect(recordKeys.recent(20)[1]).not.toBe(
      recordKeys.list('2026-10-01', '2026-10-31')[1],
    );
  });
});

describe('recordKeys.detail', () => {
  it("상세 키도 'records'로 시작한다 (수정·삭제 후 무효화에 포함)", () => {
    expect(recordKeys.detail('abc')).toEqual(['records', 'detail', 'abc']);
  });
});
