import { describe, expect, it, vi } from 'vitest';
import {
  isPagePath,
  isWarmPagesMessage,
  WARM_PAGES_MESSAGE,
  warmPageCache,
} from './offlinePages';

describe('화면 HTML 요청', () => {
  it('화면 주소는 맞고, 파일·API·콜백·서비스 워커 파일은 아니다', () => {
    expect(isPagePath('/')).toBe(true);
    expect(isPagePath('/records/view')).toBe(true);
    expect(isPagePath('/~offline')).toBe(true);
    expect(isPagePath('/robots.txt')).toBe(false);
    expect(isPagePath('/manifest.webmanifest')).toBe(false);
    expect(isPagePath('/_next/static/chunks/a.js')).toBe(false);
    expect(isPagePath('/api/account')).toBe(false);
    expect(isPagePath('/auth/callback')).toBe(false);
    expect(isPagePath('/serwist/sw.js')).toBe(false);
  });
});

// 실제 Cache 대신 주소 → 응답 Map (warmPageCache가 쓰는 match·put만)
function fakeCache(initial: string[] = []) {
  const stored = new Map(initial.map((path) => [path, new Response('old')]));
  const cache = {
    match: async (path: string) => stored.get(path),
    put: async (path: string, response: Response) => {
      stored.set(path, response);
    },
  } as unknown as Cache;
  return { cache, stored };
}

function redirectedResponse() {
  const response = new Response('<html>login</html>');
  Object.defineProperty(response, 'redirected', { value: true });
  return response;
}

describe('화면 미리 받기 (서비스 워커)', () => {
  it('이 캐시에 없는 화면만 받아 둔다', async () => {
    const { cache, stored } = fakeCache(['/']);
    const fetchPage = vi.fn(async () => new Response('page'));
    await warmPageCache({ cache, paths: ['/', '/records/new'], fetchPage });

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith('/records/new');
    expect(stored.has('/records/new')).toBe(true);
  });

  // 로그인 화면으로 돌려보내진 응답·오류를 저장하면 오프라인에서 그 화면이 뜬다
  it('돌려보내진 응답, 200이 아닌 응답, 실패는 저장하지 않고 다음 화면으로', async () => {
    const { cache, stored } = fakeCache();
    const fetchPage = vi
      .fn<(path: string) => Promise<Response>>()
      .mockResolvedValueOnce(redirectedResponse())
      .mockResolvedValueOnce(new Response('err', { status: 500 }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('page'));
    await warmPageCache({
      cache,
      paths: ['/a', '/b', '/c', '/d'],
      fetchPage,
    });

    expect([...stored.keys()]).toEqual(['/d']);
  });

  it('화면 주소가 아닌 것(파일·API)은 받지 않는다', async () => {
    const { cache } = fakeCache();
    const fetchPage = vi.fn(async () => new Response('x'));
    await warmPageCache({
      cache,
      paths: ['/api/account', '/robots.txt'],
      fetchPage,
    });
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('메시지 모양 확인', () => {
    expect(isWarmPagesMessage({ type: WARM_PAGES_MESSAGE, paths: ['/'] })).toBe(
      true,
    );
    expect(isWarmPagesMessage({ type: WARM_PAGES_MESSAGE, paths: [1] })).toBe(
      false,
    );
    expect(isWarmPagesMessage({ type: 'other', paths: [] })).toBe(false);
    expect(isWarmPagesMessage(null)).toBe(false);
  });
});
