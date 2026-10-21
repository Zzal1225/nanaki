import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { deleteAccount } from './authActions';

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

const signOut = vi.fn();
const fetchMock = vi.fn();

function respondWith(status: number) {
  // 204는 본문이 없어야 한다 (Response 생성자가 본문 있는 204를 막는다)
  fetchMock.mockResolvedValue(
    new Response(status === 204 ? null : '<html></html>', { status }),
  );
}

describe('deleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signOut.mockResolvedValue({ error: null });
    vi.mocked(createSupabaseBrowserClient).mockReturnValue({
      auth: { signOut },
    } as never);
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('204면 지운 것으로 보고 이 브라우저의 세션도 지운다', async () => {
    respondWith(204);
    expect(await deleteAccount()).toBe('deleted');
    expect(fetchMock).toHaveBeenCalledWith('/api/account', {
      method: 'DELETE',
    });
    expect(signOut).toHaveBeenCalled();
  });

  it('503이면 이 환경에서는 할 수 없음', async () => {
    respondWith(503);
    expect(await deleteAccount()).toBe('unavailable');
    expect(signOut).not.toHaveBeenCalled();
  });

  // 로그인 화면 HTML 같은 200 응답을 성공으로 착각하면, 계정이 남았는데 지운 줄 알게 된다
  it('204가 아닌 성공 응답(200 등)은 실패로 본다', async () => {
    respondWith(200);
    expect(await deleteAccount()).toBe('failed');
  });

  it('네트워크 오류도 실패', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await deleteAccount()).toBe('failed');
  });
});
