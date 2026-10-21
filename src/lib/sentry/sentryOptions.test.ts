import { describe, expect, it } from 'vitest';
import { getSentryInitOptions } from './sentryOptions';

const DSN = 'https://public@o0.ingest.sentry.io/0';

describe('getSentryInitOptions', () => {
  it('DSN이 없으면 꺼진다 (로컬 개발·CI·테스트)', () => {
    expect(
      getSentryInitOptions({ dsn: undefined, vercelEnv: undefined }).enabled,
    ).toBe(false);
  });

  it('실제 서비스: 켜지고, 성능 추적은 10%만', () => {
    const options = getSentryInitOptions({
      dsn: DSN,
      vercelEnv: 'production',
    });
    expect(options.enabled).toBe(true);
    expect(options.environment).toBe('production');
    expect(options.tracesSampleRate).toBe(0.1);
  });

  it('PR 미리보기: 오류는 보내되 환경을 나누고, 성능 추적은 하지 않는다', () => {
    const options = getSentryInitOptions({ dsn: DSN, vercelEnv: 'preview' });
    expect(options.enabled).toBe(true);
    expect(options.environment).toBe('preview');
    expect(options.tracesSampleRate).toBe(0);
  });

  // Sentry v11은 기본값이 "전부 수집"이다. 기록 내용이 실리는 통로를 모두 막았는지 확인한다
  it('개인 데이터(사용자·쿠키·헤더·HTTP 본문·쿼리)를 보내지 않는다', () => {
    const { dataCollection } = getSentryInitOptions({
      dsn: DSN,
      vercelEnv: 'production',
    });
    expect(dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    });
  });
});
