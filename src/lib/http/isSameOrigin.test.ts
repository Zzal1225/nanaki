import { describe, expect, it } from 'vitest';
import { isSameOrigin } from './isSameOrigin';

const headersOf = (values: Record<string, string>) => new Headers(values);

describe('같은 출처인지 (CSRF 막기)', () => {
  it('Origin의 호스트가 요청의 Host와 같으면 통과', () => {
    expect(
      isSameOrigin(
        headersOf({ origin: 'https://nanaki.app', host: 'nanaki.app' }),
      ),
    ).toBe(true);
  });

  it('프록시(터널·Vercel) 뒤에서는 X-Forwarded-Host와 비교한다', () => {
    expect(
      isSameOrigin(
        headersOf({
          origin: 'https://abc.trycloudflare.com',
          host: 'localhost:3100',
          'x-forwarded-host': 'abc.trycloudflare.com',
        }),
      ),
    ).toBe(true);
  });

  it('다른 사이트에서 보낸 요청, Origin이 없거나 틀린 요청은 막는다', () => {
    expect(
      isSameOrigin(
        headersOf({ origin: 'https://evil.com', host: 'nanaki.app' }),
      ),
    ).toBe(false);
    expect(isSameOrigin(headersOf({ host: 'nanaki.app' }))).toBe(false);
    expect(
      isSameOrigin(headersOf({ origin: 'null', host: 'nanaki.app' })),
    ).toBe(false);
  });
});
