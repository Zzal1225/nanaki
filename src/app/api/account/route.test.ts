import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseSecretKey } from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DELETE } from './route';

// 실제 Supabase 대신 가짜. "누구를, 어떤 조건에서 지우는지"만 본다
vi.mock('@/lib/supabase/env', () => ({ getSupabaseSecretKey: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}));

const APP_ORIGIN = 'https://nanaki.example';
const deleteUser = vi.fn();
const getUser = vi.fn();
const signOut = vi.fn();
// 사진 목록(photos 표)과 파일 삭제(Storage)
const photoRows = vi.fn();
const removeFiles = vi.fn();

function deleteRequest(origin: string | null = APP_ORIGIN) {
  // 실제 요청에는 Host 헤더가 늘 있다 (테스트의 new Request는 붙이지 않는다). 출처 검사가 Host와 비교한다 (lib/http/isSameOrigin)
  const headers = new Headers({ host: new URL(APP_ORIGIN).host });
  if (origin) headers.set('origin', origin);
  return new Request(`${APP_ORIGIN}/api/account`, {
    method: 'DELETE',
    headers,
  });
}

describe('DELETE /api/account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabaseSecretKey).mockReturnValue('sb_secret_test');
    // 테스트에 필요한 메서드만 가진 가짜라서 실제 클라이언트 타입으로 넓혀 넘긴다
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser, signOut },
    } as never);
    vi.mocked(createSupabaseAdminClient).mockReturnValue({
      auth: { admin: { deleteUser } },
      from: () => ({ select: () => ({ eq: photoRows }) }),
      storage: { from: () => ({ remove: removeFiles }) },
    } as never);
    photoRows.mockResolvedValue({ data: [], error: null });
    removeFiles.mockResolvedValue({ data: [], error: null });
    getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    deleteUser.mockResolvedValue({ error: null });
    signOut.mockResolvedValue({ error: null });
  });

  it('로그인한 본인 계정을 지우고 204', async () => {
    const response = await DELETE(deleteRequest());

    expect(response.status).toBe(204);
    expect(deleteUser).toHaveBeenCalledWith('user-1');
    expect(signOut).toHaveBeenCalled();
  });

  it('사진 파일(보기용·썸네일)을 먼저 지우고 계정을 지운다 (Storage 파일은 cascade로 지워지지 않는다)', async () => {
    photoRows.mockResolvedValue({
      data: [{ path: 'user-1/a.webp', thumb_path: 'user-1/a-thumb.webp' }],
      error: null,
    });
    const response = await DELETE(deleteRequest());

    expect(response.status).toBe(204);
    expect(removeFiles).toHaveBeenCalledWith([
      'user-1/a.webp',
      'user-1/a-thumb.webp',
    ]);
    expect(removeFiles.mock.invocationCallOrder[0]).toBeLessThan(
      deleteUser.mock.invocationCallOrder[0],
    );
  });

  it('사진 파일을 지우지 못하면 계정도 지우지 않는다 (몸 사진만 남지 않게)', async () => {
    photoRows.mockResolvedValue({
      data: [{ path: 'user-1/a.webp', thumb_path: 'user-1/a-thumb.webp' }],
      error: null,
    });
    removeFiles.mockResolvedValue({ data: null, error: { message: 'down' } });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await DELETE(deleteRequest());
    expect(response.status).toBe(500);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('다른 사이트에서 온 요청이나 Origin이 없는 요청은 403, 아무것도 지우지 않는다', async () => {
    expect((await DELETE(deleteRequest('https://evil.example'))).status).toBe(
      403,
    );
    expect((await DELETE(deleteRequest(null))).status).toBe(403);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('secret 키가 없는 환경이면 503', async () => {
    vi.mocked(getSupabaseSecretKey).mockReturnValue(null);

    expect((await DELETE(deleteRequest())).status).toBe(503);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('로그인하지 않았으면 401', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    expect((await DELETE(deleteRequest())).status).toBe(401);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('삭제에 실패하면 500, 로그아웃하지 않는다', async () => {
    deleteUser.mockResolvedValue({ error: { message: '실패' } });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect((await DELETE(deleteRequest())).status).toBe(500);
    expect(signOut).not.toHaveBeenCalled();
  });
});
