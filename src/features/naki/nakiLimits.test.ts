import { describe, expect, it } from 'vitest';
import { parseQuotaResult, readNakiLimits, toKstDate } from './nakiLimits';

describe('나키 하루 횟수 규칙', () => {
  it('기본 10 / 3 / 200, 환경 변수로 바꾼다', () => {
    expect(readNakiLimits({})).toEqual({ user: 10, guest: 3, global: 200 });
    expect(
      readNakiLimits({
        NAKI_DAILY_LIMIT_USER: '15',
        NAKI_DAILY_LIMIT_GUEST: ' 5 ',
        NAKI_DAILY_LIMIT_GLOBAL: '500',
      }),
    ).toEqual({ user: 15, guest: 5, global: 500 });
  });

  it('틀리거나 0이면 기본값 (오타로 나키가 멈추지 않게)', () => {
    expect(
      readNakiLimits({
        NAKI_DAILY_LIMIT_USER: '0',
        NAKI_DAILY_LIMIT_GUEST: '-3',
        NAKI_DAILY_LIMIT_GLOBAL: '2백',
      }),
    ).toEqual({ user: 10, guest: 3, global: 200 });
  });

  it('하루는 한국 날짜: UTC 14:59는 그날, 15:00(한국 자정)부터 다음 날', () => {
    expect(toKstDate(new Date('2026-10-23T14:59:59Z'))).toBe('2026-10-23');
    expect(toKstDate(new Date('2026-10-23T15:00:00Z'))).toBe('2026-10-24');
    // 한국 오전 8시 = UTC 전날 23시: UTC 날짜를 쓰면 하루 밀린다
    expect(toKstDate(new Date('2026-10-22T23:00:00Z'))).toBe('2026-10-23');
    // 해 넘김
    expect(toKstDate(new Date('2026-12-31T15:00:00Z'))).toBe('2027-01-01');
  });

  it('DB 결과 읽기', () => {
    expect(parseQuotaResult('ok:9')).toEqual({ kind: 'ok', remaining: 9 });
    expect(parseQuotaResult('user_limit')).toEqual({ kind: 'userLimit' });
    expect(parseQuotaResult('global_limit')).toEqual({ kind: 'globalLimit' });
    expect(() => parseQuotaResult('??')).toThrow();
  });
});
